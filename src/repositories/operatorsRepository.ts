import { getDatabase } from '../database/connection';
import { Operador, OperadorInput } from '../types/domain';
import { getNowParts } from '../utils/date';
import { normalizeSearch } from '../utils/format';
import { buildEntitySyncId, getNextLocalEventMetadata, recordLocalSyncEvent } from './syncEventsRepository';

type OperadorRow = {
  id: number;
  sync_id: string;
  nome: string;
  ativo: number;
  created_at: string;
  updated_at: string;
};

function mapRow(row: OperadorRow): Operador {
  return {
    id: row.id,
    syncId: row.sync_id,
    nome: row.nome,
    ativo: Boolean(row.ativo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prepareOperadorInput(input: OperadorInput) {
  const nome = input.nome.trim().replace(/\s+/g, ' ');

  if (!nome) {
    throw new Error('Informe o nome do operador.');
  }

  return {
    nome,
    normalizedName: normalizeSearch(nome),
  };
}

export async function listOperadores(search = '', includeInactive = true) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OperadorRow>(
    `SELECT *
     FROM operadores
     ${includeInactive ? '' : 'WHERE ativo = 1'}
     ORDER BY nome COLLATE NOCASE ASC;`
  );
  const normalized = normalizeSearch(search);

  return rows
    .map(mapRow)
    .filter((operador) => !normalized || normalizeSearch(operador.nome).includes(normalized));
}

export async function listOperadoresAtivos() {
  return listOperadores('', false);
}

export async function getOperadorById(id: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<OperadorRow>('SELECT * FROM operadores WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

export async function getOperadorBySyncId(syncId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<OperadorRow>('SELECT * FROM operadores WHERE sync_id = ?;', [syncId]);
  return row ? mapRow(row) : null;
}

export async function createOperador(input: OperadorInput) {
  const db = await getDatabase();
  const operador = prepareOperadorInput(input);
  const existingRows = await db.getAllAsync<OperadorRow>('SELECT * FROM operadores;');
  const duplicated = existingRows.find((row) => normalizeSearch(row.nome) === operador.normalizedName);

  if (duplicated) {
    throw new Error('Já existe um operador com esse nome.');
  }

  const { iso } = getNowParts();
  const metadata = await getNextLocalEventMetadata(db);
  const syncId = buildEntitySyncId('operador', metadata.deviceId, metadata.sequence);

  await db.execAsync('BEGIN TRANSACTION;');

  try {
    await db.runAsync(
      `INSERT INTO operadores (sync_id, nome, ativo, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?);`,
      [syncId, operador.nome, iso, iso]
    );

    await recordLocalSyncEvent(db, {
      metadata,
      entityType: 'OPERADOR',
      entitySyncId: syncId,
      eventType: 'OPERADOR_UPSERTED',
      payload: {
        nome: operador.nome,
        ativo: true,
        createdAt: iso,
        updatedAt: iso,
      },
    });

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }

  const created = await getOperadorBySyncId(syncId);

  if (!created) {
    throw new Error('Não foi possível carregar o operador cadastrado.');
  }

  return created;
}

export async function updateOperador(id: number, input: OperadorInput) {
  const db = await getDatabase();
  const operador = prepareOperadorInput(input);
  const current = await getOperadorById(id);

  if (!current) {
    throw new Error('Operador não encontrado.');
  }

  const existingRows = await db.getAllAsync<OperadorRow>('SELECT * FROM operadores;');
  const duplicated = existingRows.find((row) => row.id !== id && normalizeSearch(row.nome) === operador.normalizedName);

  if (duplicated) {
    throw new Error('Já existe outro operador com esse nome.');
  }

  const { iso } = getNowParts();
  const metadata = await getNextLocalEventMetadata(db);

  await db.execAsync('BEGIN TRANSACTION;');

  try {
    await db.runAsync('UPDATE operadores SET nome = ?, updated_at = ? WHERE id = ?;', [operador.nome, iso, id]);

    await db.runAsync(
      `UPDATE configuracoes
       SET operador_atual_nome = CASE
         WHEN operador_atual_sync_id = ? THEN ?
         ELSE operador_atual_nome
       END
       WHERE id = 1;`,
      [current.syncId, operador.nome]
    );

    await recordLocalSyncEvent(db, {
      metadata,
      entityType: 'OPERADOR',
      entitySyncId: current.syncId,
      eventType: 'OPERADOR_UPSERTED',
      payload: {
        nome: operador.nome,
        ativo: current.ativo,
        createdAt: current.createdAt,
        updatedAt: iso,
      },
    });

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }

  const updated = await getOperadorById(id);

  if (!updated) {
    throw new Error('Não foi possível carregar o operador atualizado.');
  }

  return updated;
}

export async function updateOperadorAtivo(id: number, ativo: boolean) {
  const db = await getDatabase();
  const current = await getOperadorById(id);

  if (!current) {
    throw new Error('Operador não encontrado.');
  }

  const { iso } = getNowParts();
  const metadata = await getNextLocalEventMetadata(db);

  await db.execAsync('BEGIN TRANSACTION;');

  try {
    await db.runAsync('UPDATE operadores SET ativo = ?, updated_at = ? WHERE id = ?;', [ativo ? 1 : 0, iso, id]);

    if (!ativo) {
      await db.runAsync(
        `UPDATE configuracoes
         SET operador_atual_sync_id = CASE WHEN operador_atual_sync_id = ? THEN '' ELSE operador_atual_sync_id END,
             operador_atual_nome = CASE WHEN operador_atual_sync_id = ? THEN '' ELSE operador_atual_nome END
         WHERE id = 1;`,
        [current.syncId, current.syncId]
      );
    }

    await recordLocalSyncEvent(db, {
      metadata,
      entityType: 'OPERADOR',
      entitySyncId: current.syncId,
      eventType: 'OPERADOR_UPSERTED',
      payload: {
        nome: current.nome,
        ativo,
        createdAt: current.createdAt,
        updatedAt: iso,
      },
    });

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function getOperadorAtual() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ operador_atual_sync_id: string; operador_atual_nome: string }>(
    'SELECT operador_atual_sync_id, operador_atual_nome FROM configuracoes WHERE id = 1;'
  );

  return {
    operadorAtualSyncId: row?.operador_atual_sync_id ?? '',
    operadorAtualNome: row?.operador_atual_nome ?? '',
  };
}

export async function definirOperadorAtual(syncId: string) {
  const db = await getDatabase();
  const operador = await getOperadorBySyncId(syncId);

  if (!operador || !operador.ativo) {
    throw new Error('Escolha um operador ativo para este aparelho.');
  }

  await db.runAsync(
    `UPDATE configuracoes
     SET operador_atual_sync_id = ?,
         operador_atual_nome = ?
     WHERE id = 1;`,
    [operador.syncId, operador.nome]
  );

  return operador;
}

export async function limparOperadorAtual() {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE configuracoes
     SET operador_atual_sync_id = '',
         operador_atual_nome = ''
     WHERE id = 1;`
  );
}
