import { getDatabase } from '../database/connection';
import { Integrante, IntegranteInput } from '../types/domain';
import { getNowParts } from '../utils/date';
import { normalizeSearch } from '../utils/format';

type IntegranteRow = {
  id: number;
  nome: string;
  patente: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: IntegranteRow): Integrante {
  return {
    id: row.id,
    nome: row.nome,
    patente: row.patente,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prepareIntegranteInput(input: IntegranteInput) {
  const nome = input.nome.trim().replace(/\s+/g, ' ');
  const patente = input.patente.trim().replace(/\s+/g, ' ').toUpperCase();

  if (!nome) {
    throw new Error('Informe o nome do integrante.');
  }

  if (!patente) {
    throw new Error('Informe a patente do integrante.');
  }

  return {
    nome,
    patente,
    normalizedName: normalizeSearch(nome),
  };
}

function indexRowsByNormalizedName(rows: IntegranteRow[]) {
  const indexed = new Map<string, IntegranteRow>();

  rows.forEach((row) => {
    indexed.set(normalizeSearch(row.nome), row);
  });

  return indexed;
}

export async function listIntegrantes(search = '') {
  const db = await getDatabase();
  const rows = await db.getAllAsync<IntegranteRow>('SELECT * FROM integrantes ORDER BY nome COLLATE NOCASE ASC;');
  const normalized = normalizeSearch(search);

  return rows
    .map(mapRow)
    .filter((integrante) => {
      if (!normalized) {
        return true;
      }

      return normalizeSearch(integrante.nome).includes(normalized);
    });
}

export async function getIntegranteById(id: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<IntegranteRow>('SELECT * FROM integrantes WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

export async function countIntegrantes() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM integrantes;');
  return row?.total ?? 0;
}

export async function createIntegrante(input: IntegranteInput) {
  const db = await getDatabase();
  const integrante = prepareIntegranteInput(input);
  const existingRows = await db.getAllAsync<IntegranteRow>('SELECT * FROM integrantes;');
  const duplicated = existingRows.find((row) => normalizeSearch(row.nome) === integrante.normalizedName);

  if (duplicated) {
    throw new Error('Já existe um integrante com esse nome.');
  }

  const { iso } = getNowParts();
  const result = await db.runAsync(
    'INSERT INTO integrantes (nome, patente, created_at, updated_at) VALUES (?, ?, ?, ?);',
    [integrante.nome, integrante.patente, iso, iso]
  );

  const created = await getIntegranteById(Number(result.lastInsertRowId));

  if (!created) {
    throw new Error('Não foi possível carregar o integrante cadastrado.');
  }

  return created;
}

export async function updateIntegrante(id: number, input: IntegranteInput) {
  const db = await getDatabase();
  const integrante = prepareIntegranteInput(input);
  const current = await getIntegranteById(id);

  if (!current) {
    throw new Error('Integrante não encontrado.');
  }

  const existingRows = await db.getAllAsync<IntegranteRow>('SELECT * FROM integrantes;');
  const duplicated = existingRows.find(
    (row) => row.id !== id && normalizeSearch(row.nome) === integrante.normalizedName
  );

  if (duplicated) {
    throw new Error('Já existe outro integrante com esse nome.');
  }

  const { iso } = getNowParts();
  await db.runAsync('UPDATE integrantes SET nome = ?, patente = ?, updated_at = ? WHERE id = ?;', [
    integrante.nome,
    integrante.patente,
    iso,
    id,
  ]);

  const updated = await getIntegranteById(id);

  if (!updated) {
    throw new Error('Não foi possível carregar o integrante atualizado.');
  }

  return updated;
}

export async function deleteIntegrante(id: number) {
  const db = await getDatabase();
  const current = await getIntegranteById(id);

  if (!current) {
    throw new Error('Integrante não encontrado.');
  }

  const linkedOrders = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM pedidos WHERE integrante_id = ?;',
    [id]
  );

  if ((linkedOrders?.total ?? 0) > 0) {
    throw new Error('Não é possível excluir um integrante que já possui pedidos no histórico.');
  }

  await db.runAsync('DELETE FROM integrantes WHERE id = ?;', [id]);
}

export async function upsertIntegrantes(input: IntegranteInput[]) {
  const db = await getDatabase();
  const existingRows = await db.getAllAsync<IntegranteRow>('SELECT * FROM integrantes;');
  const existingByName = indexRowsByNormalizedName(existingRows);
  const { iso } = getNowParts();
  let inserted = 0;
  let updated = 0;

  for (const rawIntegrante of input) {
    const integrante = prepareIntegranteInput(rawIntegrante);
    const existing = existingByName.get(integrante.normalizedName);

    if (existing) {
      updated += 1;

      await db.runAsync('UPDATE integrantes SET nome = ?, patente = ?, updated_at = ? WHERE id = ?;', [
        integrante.nome,
        integrante.patente,
        iso,
        existing.id,
      ]);

      existingByName.set(integrante.normalizedName, {
        ...existing,
        nome: integrante.nome,
        patente: integrante.patente,
        updated_at: iso,
      });
    } else {
      inserted += 1;
      const result = await db.runAsync(
        'INSERT INTO integrantes (nome, patente, created_at, updated_at) VALUES (?, ?, ?, ?);',
        [integrante.nome, integrante.patente, iso, iso]
      );

      existingByName.set(integrante.normalizedName, {
        id: Number(result.lastInsertRowId),
        nome: integrante.nome,
        patente: integrante.patente,
        created_at: iso,
        updated_at: iso,
      });
    }
  }

  return {
    inserted,
    updated,
    totalProcessed: input.length,
  };
}

export async function clearIntegrantes() {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM pedido_itens;
    DELETE FROM pedidos;
    DELETE FROM integrantes;
  `);
}
