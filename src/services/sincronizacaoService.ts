import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database/connection';
import { listBlobsByIds, registerBlobOnDatabase } from '../repositories/syncBlobsRepository';
import { getConfiguracao } from '../repositories/configuracaoRepository';
import {
  buildEntitySyncId,
  countMissingEvents,
  ensureLocalDeviceIdentity,
  getNextLocalEventMetadata,
  getLocalSyncStatus,
  insertSyncEvent,
  listKnownDevices,
  listSyncEvents,
  upsertKnownDevice,
  updateLocalSyncTimestamps,
} from '../repositories/syncEventsRepository';
import { getLatestImportFromDevice, hasImportedPackage, listSyncImports, recordImportedPackage } from '../repositories/syncImportsRepository';
import { buildFileStamp, getNowParts } from '../utils/date';
import { hashString } from '../utils/hash';
import { readFileAsBase64, readTextFile, sanitizeLocalFileName, writeBase64FileToAppDirectory, writeTextFile } from '../utils/file';
import {
  SyncBlobRecord,
  SyncEventRecord,
  SyncImportResult,
  SyncPackageBlob,
  SyncPackageEvent,
  SyncPackageFile,
  SyncPackagePreview,
} from '../types/sync';

type IntegranteSyncRow = {
  id: number;
  sync_id: string;
  nome: string;
  patente: string;
  created_at: string;
  updated_at: string;
};

type ItemSyncRow = {
  id: number;
  sync_id: string;
  numero_item: number;
  nome: string;
  valor: number;
  qtd_estoque: number;
  ativo: number;
  created_at: string;
  updated_at: string;
};

type PedidoSyncRow = {
  id: number;
  sync_id: string;
  integrante_id: number;
  nome_integrante_snapshot: string;
  patente_integrante_snapshot: string;
  data_pedido: string;
  hora_pedido: string;
  data_hora_pedido: string;
  status: 'ABERTO' | 'FECHADO_AGUARDANDO_PAGAMENTO' | 'PAGO';
  total: number;
  cancelado: number;
  cancelado_em: string;
  metodo_pagamento: 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | '';
  comprovante_uri: string;
  comprovante_nome: string;
  comprovante_mime_type: string;
  comprovante_adicionado_em: string;
  created_at: string;
  updated_at: string;
};

type PedidoItemSyncRow = {
  id: number;
  sync_id: string;
  pedido_id: number;
  item_id: number;
  nome_item_snapshot: string;
  valor_unitario_snapshot: number;
  quantidade: number;
  subtotal: number;
};

type SyncBlobRow = {
  id: number;
  blob_id: string;
  nome: string;
  mime_type: string;
  local_uri: string;
  hash: string;
  created_at: string;
};

function mapBlobRow(row: SyncBlobRow): SyncBlobRecord {
  return {
    id: row.id,
    blobId: row.blob_id,
    nome: row.nome,
    mimeType: row.mime_type,
    localUri: row.local_uri,
    hash: row.hash,
    createdAt: row.created_at,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertSyncPackageFile(value: unknown): asserts value is SyncPackageFile {
  if (!isObject(value)) {
    throw new Error('Pacote de sincronização inválido.');
  }

  if (value.schemaVersion !== 1 || typeof value.packageId !== 'string' || typeof value.exportedAt !== 'string') {
    throw new Error('Formato de sincronização incompatível.');
  }

  if (!isObject(value.sourceDevice) || typeof value.sourceDevice.deviceId !== 'string' || typeof value.sourceDevice.name !== 'string') {
    throw new Error('Metadados do aparelho de origem estão inválidos.');
  }

  if (!Array.isArray(value.events) || !Array.isArray(value.blobs)) {
    throw new Error('Pacote de sincronização sem eventos ou anexos válidos.');
  }
}

function toEventRow(event: SyncPackageEvent): Omit<SyncEventRecord, 'id'> {
  return {
    eventId: event.eventId,
    deviceId: event.deviceId,
    deviceName: event.deviceName,
    sequence: event.sequence,
    entityType: event.entityType,
    entitySyncId: event.entitySyncId,
    eventType: event.eventType,
    payload: event.payload,
    createdAt: event.createdAt,
  };
}

function extractBlobId(payload: Record<string, unknown>) {
  return typeof payload.blobId === 'string' ? payload.blobId : '';
}

function buildPackageFileName() {
  return `bar13_sync_${buildFileStamp()}.bar13sync`;
}

function countUniqueEntityEvents(events: SyncPackageEvent[], entityType: SyncPackageEvent['entityType']) {
  return new Set(events.filter((event) => event.entityType === entityType).map((event) => event.entitySyncId)).size;
}

function countUniqueOrderEvents(events: SyncPackageEvent[]) {
  return new Set(
    events
      .filter((event) => event.entityType === 'PEDIDO' || event.eventType === 'PEDIDO_ITEM_ADICIONADO' || event.eventType === 'PEDIDO_ITEM_REMOVIDO')
      .map((event) => {
        if (event.entityType === 'PEDIDO') {
          return event.entitySyncId;
        }

        return typeof event.payload.pedidoSyncId === 'string' ? event.payload.pedidoSyncId : event.entitySyncId;
      })
  ).size;
}

async function getNextNumeroItem(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ next_numero_item: number }>(
    'SELECT COALESCE(MAX(numero_item), 0) + 1 as next_numero_item FROM itens_bar;'
  );
  return row?.next_numero_item ?? 1;
}

async function recomputeOrderTotal(db: SQLiteDatabase, pedidoId: number) {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(subtotal), 0) as total FROM pedido_itens WHERE pedido_id = ?;',
    [pedidoId]
  );
  await db.runAsync('UPDATE pedidos SET total = ? WHERE id = ?;', [row?.total ?? 0, pedidoId]);
}

async function findIntegranteBySyncId(db: SQLiteDatabase, syncId: string) {
  return db.getFirstAsync<IntegranteSyncRow>('SELECT * FROM integrantes WHERE sync_id = ?;', [syncId]);
}

async function findItemBySyncId(db: SQLiteDatabase, syncId: string) {
  return db.getFirstAsync<ItemSyncRow>('SELECT * FROM itens_bar WHERE sync_id = ?;', [syncId]);
}

async function findPedidoBySyncId(db: SQLiteDatabase, syncId: string) {
  return db.getFirstAsync<PedidoSyncRow>('SELECT * FROM pedidos WHERE sync_id = ?;', [syncId]);
}

async function findPedidoItemBySyncId(db: SQLiteDatabase, syncId: string) {
  return db.getFirstAsync<PedidoItemSyncRow>('SELECT * FROM pedido_itens WHERE sync_id = ?;', [syncId]);
}

async function hasEntityEvent(db: SQLiteDatabase, entitySyncId: string, eventType: string) {
  const row = await db.getFirstAsync<{ found: number }>(
    'SELECT 1 as found FROM sync_events WHERE entity_sync_id = ? AND event_type = ? LIMIT 1;',
    [entitySyncId, eventType]
  );
  return Boolean(row?.found);
}

async function assignMissingSyncIds(db: SQLiteDatabase) {
  const integrantes = await db.getAllAsync<IntegranteSyncRow>('SELECT * FROM integrantes WHERE sync_id = \'\';');
  for (const integrante of integrantes) {
    const metadata = await getNextLocalEventMetadata(db);
    await db.runAsync('UPDATE integrantes SET sync_id = ? WHERE id = ?;', [
      buildEntitySyncId('integrante', metadata.deviceId, metadata.sequence),
      integrante.id,
    ]);
  }

  const itens = await db.getAllAsync<ItemSyncRow>('SELECT * FROM itens_bar WHERE sync_id = \'\';');
  for (const item of itens) {
    const metadata = await getNextLocalEventMetadata(db);
    await db.runAsync('UPDATE itens_bar SET sync_id = ? WHERE id = ?;', [
      buildEntitySyncId('item', metadata.deviceId, metadata.sequence),
      item.id,
    ]);
  }

  const pedidos = await db.getAllAsync<PedidoSyncRow>('SELECT * FROM pedidos WHERE sync_id = \'\';');
  for (const pedido of pedidos) {
    const metadata = await getNextLocalEventMetadata(db);
    await db.runAsync('UPDATE pedidos SET sync_id = ? WHERE id = ?;', [
      buildEntitySyncId('pedido', metadata.deviceId, metadata.sequence),
      pedido.id,
    ]);
  }

  const pedidoItens = await db.getAllAsync<PedidoItemSyncRow>('SELECT * FROM pedido_itens WHERE sync_id = \'\';');
  for (const pedidoItem of pedidoItens) {
    const metadata = await getNextLocalEventMetadata(db);
    await db.runAsync('UPDATE pedido_itens SET sync_id = ? WHERE id = ?;', [
      buildEntitySyncId('pedido_item', metadata.deviceId, metadata.sequence),
      pedidoItem.id,
    ]);
  }
}

async function ensureLocalDeviceRegistered(db: SQLiteDatabase) {
  const local = await getLocalSyncStatus();
  if (!local.deviceId) {
    return;
  }

  await upsertKnownDevice(db, {
    deviceId: local.deviceId,
    nomeAparelho: local.nomeAparelho,
  });
}

async function ensureBlobFromOrderProof(db: SQLiteDatabase, pedido: PedidoSyncRow) {
  if (!pedido.comprovante_uri || !pedido.comprovante_nome) {
    return null;
  }

  const existing = await db.getFirstAsync<SyncBlobRow>(
    'SELECT * FROM sync_blobs WHERE local_uri = ? LIMIT 1;',
    [pedido.comprovante_uri]
  );

  if (existing) {
    return mapBlobRow(existing);
  }

  const base64 = await readFileAsBase64(pedido.comprovante_uri);
  const metadata = await getNextLocalEventMetadata(db);
  const blobId = buildEntitySyncId('blob', metadata.deviceId, metadata.sequence);

  await registerBlobOnDatabase(db, {
    blobId,
    nome: pedido.comprovante_nome,
    mimeType: pedido.comprovante_mime_type,
    localUri: pedido.comprovante_uri,
    hash: hashString(base64),
    createdAt: pedido.comprovante_adicionado_em || pedido.updated_at,
  });

  const created = await db.getFirstAsync<SyncBlobRow>('SELECT * FROM sync_blobs WHERE blob_id = ?;', [blobId]);
  return created ? mapBlobRow(created) : null;
}

async function backfillIntegranteEvents(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<IntegranteSyncRow>('SELECT * FROM integrantes;');

  for (const integrante of rows) {
    const alreadyRecorded = await hasEntityEvent(db, integrante.sync_id, 'INTEGRANTE_UPSERTED');

    if (alreadyRecorded) {
      continue;
    }

    const metadata = await getNextLocalEventMetadata(db);
    await insertSyncEvent(db, {
      eventId: metadata.eventId,
      deviceId: metadata.deviceId,
      deviceName: metadata.deviceName,
      sequence: metadata.sequence,
      entityType: 'INTEGRANTE',
      entitySyncId: integrante.sync_id,
      eventType: 'INTEGRANTE_UPSERTED',
      payload: {
        nome: integrante.nome,
        patente: integrante.patente,
        createdAt: integrante.created_at,
        updatedAt: integrante.updated_at,
      },
      createdAt: metadata.createdAt,
    });
  }
}

async function backfillItemEvents(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<ItemSyncRow>('SELECT * FROM itens_bar;');

  for (const item of rows) {
    const alreadyRecorded = await hasEntityEvent(db, item.sync_id, 'ITEM_UPSERTED');

    if (alreadyRecorded) {
      continue;
    }

    const metadata = await getNextLocalEventMetadata(db);
    await insertSyncEvent(db, {
      eventId: metadata.eventId,
      deviceId: metadata.deviceId,
      deviceName: metadata.deviceName,
      sequence: metadata.sequence,
      entityType: 'ITEM',
      entitySyncId: item.sync_id,
      eventType: 'ITEM_UPSERTED',
      payload: {
        nome: item.nome,
        valor: item.valor,
        qtdEstoque: item.qtd_estoque,
        ativo: Boolean(item.ativo),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      },
      createdAt: metadata.createdAt,
    });
  }
}

async function backfillPedidoEvents(db: SQLiteDatabase) {
  const pedidos = await db.getAllAsync<PedidoSyncRow>('SELECT * FROM pedidos ORDER BY created_at ASC, id ASC;');

  for (const pedido of pedidos) {
    const integrante = await db.getFirstAsync<IntegranteSyncRow>('SELECT * FROM integrantes WHERE id = ?;', [pedido.integrante_id]);

    if (!integrante) {
      continue;
    }

    if (!(await hasEntityEvent(db, pedido.sync_id, 'PEDIDO_CRIADO'))) {
      const metadata = await getNextLocalEventMetadata(db);
      await insertSyncEvent(db, {
        eventId: metadata.eventId,
        deviceId: metadata.deviceId,
        deviceName: metadata.deviceName,
        sequence: metadata.sequence,
        entityType: 'PEDIDO',
        entitySyncId: pedido.sync_id,
        eventType: 'PEDIDO_CRIADO',
        payload: {
          integranteSyncId: integrante.sync_id,
          nomeIntegranteSnapshot: pedido.nome_integrante_snapshot,
          patenteIntegranteSnapshot: pedido.patente_integrante_snapshot,
          dataPedido: pedido.data_pedido,
          horaPedido: pedido.hora_pedido,
          dataHoraPedido: pedido.data_hora_pedido,
          status: 'ABERTO',
          total: pedido.total,
          cancelado: Boolean(pedido.cancelado),
          canceladoEm: pedido.cancelado_em,
          createdAt: pedido.created_at,
          updatedAt: pedido.updated_at,
        },
        createdAt: metadata.createdAt,
      });
    }

    const itens = await db.getAllAsync<PedidoItemSyncRow>('SELECT * FROM pedido_itens WHERE pedido_id = ? ORDER BY id ASC;', [pedido.id]);

    for (const itemPedido of itens) {
      const item = await db.getFirstAsync<ItemSyncRow>('SELECT * FROM itens_bar WHERE id = ?;', [itemPedido.item_id]);

      if (!item || (await hasEntityEvent(db, itemPedido.sync_id, 'PEDIDO_ITEM_ADICIONADO'))) {
        continue;
      }

      const metadata = await getNextLocalEventMetadata(db);
      await insertSyncEvent(db, {
        eventId: metadata.eventId,
        deviceId: metadata.deviceId,
        deviceName: metadata.deviceName,
        sequence: metadata.sequence,
        entityType: 'PEDIDO_ITEM',
        entitySyncId: itemPedido.sync_id,
        eventType: 'PEDIDO_ITEM_ADICIONADO',
        payload: {
          pedidoSyncId: pedido.sync_id,
          itemSyncId: item.sync_id,
          nomeItemSnapshot: itemPedido.nome_item_snapshot,
          valorUnitarioSnapshot: itemPedido.valor_unitario_snapshot,
          quantidade: itemPedido.quantidade,
          subtotal: itemPedido.subtotal,
          pedidoTotal: pedido.total,
          updatedAt: pedido.updated_at,
        },
        createdAt: metadata.createdAt,
      });
    }

    if (pedido.cancelado && !(await hasEntityEvent(db, pedido.sync_id, 'PEDIDO_CANCELADO'))) {
      const metadata = await getNextLocalEventMetadata(db);
      await insertSyncEvent(db, {
        eventId: metadata.eventId,
        deviceId: metadata.deviceId,
        deviceName: metadata.deviceName,
        sequence: metadata.sequence,
        entityType: 'PEDIDO',
        entitySyncId: pedido.sync_id,
        eventType: 'PEDIDO_CANCELADO',
        payload: {
          status: pedido.status,
          cancelado: true,
          canceladoEm: pedido.cancelado_em,
          total: pedido.total,
          updatedAt: pedido.updated_at,
        },
        createdAt: metadata.createdAt,
      });
      continue;
    }

    if (pedido.status !== 'ABERTO' && !(await hasEntityEvent(db, pedido.sync_id, 'PEDIDO_FECHADO'))) {
      const metadata = await getNextLocalEventMetadata(db);
      await insertSyncEvent(db, {
        eventId: metadata.eventId,
        deviceId: metadata.deviceId,
        deviceName: metadata.deviceName,
        sequence: metadata.sequence,
        entityType: 'PEDIDO',
        entitySyncId: pedido.sync_id,
        eventType: 'PEDIDO_FECHADO',
        payload: {
          status: 'FECHADO_AGUARDANDO_PAGAMENTO',
          total: pedido.total,
          updatedAt: pedido.updated_at,
        },
        createdAt: metadata.createdAt,
      });
    }

    if (pedido.status === 'PAGO' && !(await hasEntityEvent(db, pedido.sync_id, 'PEDIDO_PAGO'))) {
      const blob = await ensureBlobFromOrderProof(db, pedido);
      const metadata = await getNextLocalEventMetadata(db);
      await insertSyncEvent(db, {
        eventId: metadata.eventId,
        deviceId: metadata.deviceId,
        deviceName: metadata.deviceName,
        sequence: metadata.sequence,
        entityType: 'PEDIDO',
        entitySyncId: pedido.sync_id,
        eventType: 'PEDIDO_PAGO',
        payload: {
          metodoPagamento: pedido.metodo_pagamento,
          comprovanteNome: pedido.comprovante_nome,
          comprovanteMimeType: pedido.comprovante_mime_type,
          comprovanteAdicionadoEm: pedido.comprovante_adicionado_em,
          blobId: blob?.blobId ?? '',
          blobHash: blob?.hash ?? '',
          updatedAt: pedido.updated_at,
        },
        createdAt: metadata.createdAt,
      });
    }
  }
}

function sortPackageEvents(events: SyncPackageEvent[]) {
  return [...events].sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return left.createdAt.localeCompare(right.createdAt);
    }

    if (left.deviceId !== right.deviceId) {
      return left.deviceId.localeCompare(right.deviceId);
    }

    return left.sequence - right.sequence;
  });
}

async function readSyncPackageFile(uri: string) {
  const contents = await readTextFile(uri);
  const parsed = JSON.parse(contents) as unknown;
  assertSyncPackageFile(parsed);
  return parsed;
}

async function applyIntegranteEvent(db: SQLiteDatabase, event: SyncPackageEvent) {
  const payload = event.payload;
  const nome = typeof payload.nome === 'string' ? payload.nome : '';
  const patente = typeof payload.patente === 'string' ? payload.patente : '';
  const createdAt = typeof payload.createdAt === 'string' ? payload.createdAt : event.createdAt;
  const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : event.createdAt;

  if (!nome || !patente) {
    throw new Error('Evento de integrante inválido.');
  }

  const existingBySync = await findIntegranteBySyncId(db, event.entitySyncId);
  const existingByName = await db.getFirstAsync<IntegranteSyncRow>('SELECT * FROM integrantes WHERE nome = ? COLLATE NOCASE;', [nome]);

  if (existingBySync || existingByName) {
    const target = existingBySync ?? existingByName;

    if (!target) {
      throw new Error('Integrante importado sem destino válido.');
    }

    await db.runAsync(
      `UPDATE integrantes
       SET sync_id = ?,
           nome = ?,
           patente = ?,
           updated_at = ?
       WHERE id = ?;`,
      [event.entitySyncId, nome, patente, updatedAt, target.id]
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO integrantes (sync_id, nome, patente, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?);`,
    [event.entitySyncId, nome, patente, createdAt, updatedAt]
  );
}

async function applyItemEvent(db: SQLiteDatabase, event: SyncPackageEvent) {
  const payload = event.payload;
  const nome = typeof payload.nome === 'string' ? payload.nome : '';
  const valor = typeof payload.valor === 'number' ? payload.valor : 0;
  const qtdEstoque = typeof payload.qtdEstoque === 'number' ? payload.qtdEstoque : 0;
  const ativo = Boolean(payload.ativo);
  const createdAt = typeof payload.createdAt === 'string' ? payload.createdAt : event.createdAt;
  const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : event.createdAt;

  if (!nome || !Number.isFinite(valor) || valor <= 0) {
    throw new Error('Evento de item inválido.');
  }

  const existingBySync = await findItemBySyncId(db, event.entitySyncId);
  const existingByName = await db.getFirstAsync<ItemSyncRow>('SELECT * FROM itens_bar WHERE nome = ? COLLATE NOCASE;', [nome]);

  if (existingBySync || existingByName) {
    const target = existingBySync ?? existingByName;

    if (!target) {
      throw new Error('Item importado sem destino válido.');
    }

    await db.runAsync(
      `UPDATE itens_bar
       SET sync_id = ?,
           nome = ?,
           valor = ?,
           ativo = ?,
           updated_at = ?
       WHERE id = ?;`,
      [event.entitySyncId, nome, valor, ativo ? 1 : 0, updatedAt, target.id]
    );
    return;
  }

  const nextNumeroItem = await getNextNumeroItem(db);
  await db.runAsync(
    `INSERT INTO itens_bar (
      sync_id,
      numero_item,
      nome,
      valor,
      qtd_estoque,
      ativo,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [event.entitySyncId, nextNumeroItem, nome, valor, qtdEstoque, ativo ? 1 : 0, createdAt, updatedAt]
  );
}

async function applyPedidoCriadoEvent(db: SQLiteDatabase, event: SyncPackageEvent) {
  const payload = event.payload;
  const integranteSyncId = typeof payload.integranteSyncId === 'string' ? payload.integranteSyncId : '';
  const integrante = await findIntegranteBySyncId(db, integranteSyncId);

  if (!integrante) {
    throw new Error('Pedido importado referencia um integrante inexistente.');
  }

  const existing = await findPedidoBySyncId(db, event.entitySyncId);
  const dataPedido = typeof payload.dataPedido === 'string' ? payload.dataPedido : '';
  const horaPedido = typeof payload.horaPedido === 'string' ? payload.horaPedido : '';
  const dataHoraPedido = typeof payload.dataHoraPedido === 'string' ? payload.dataHoraPedido : '';
  const nomeIntegranteSnapshot = typeof payload.nomeIntegranteSnapshot === 'string' ? payload.nomeIntegranteSnapshot : integrante.nome;
  const patenteIntegranteSnapshot =
    typeof payload.patenteIntegranteSnapshot === 'string' ? payload.patenteIntegranteSnapshot : integrante.patente;
  const createdAt = typeof payload.createdAt === 'string' ? payload.createdAt : event.createdAt;
  const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : event.createdAt;

  if (existing) {
    await db.runAsync(
      `UPDATE pedidos
       SET integrante_id = ?,
           nome_integrante_snapshot = ?,
           patente_integrante_snapshot = ?,
           data_pedido = ?,
           hora_pedido = ?,
           data_hora_pedido = ?,
           updated_at = ?
       WHERE id = ?;`,
      [integrante.id, nomeIntegranteSnapshot, patenteIntegranteSnapshot, dataPedido, horaPedido, dataHoraPedido, updatedAt, existing.id]
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO pedidos (
      sync_id,
      integrante_id,
      nome_integrante_snapshot,
      patente_integrante_snapshot,
      data_pedido,
      hora_pedido,
      data_hora_pedido,
      status,
      total,
      cancelado,
      cancelado_em,
      metodo_pagamento,
      comprovante_uri,
      comprovante_nome,
      comprovante_mime_type,
      comprovante_adicionado_em,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ABERTO', 0, 0, '', '', '', '', '', '', ?, ?);`,
    [event.entitySyncId, integrante.id, nomeIntegranteSnapshot, patenteIntegranteSnapshot, dataPedido, horaPedido, dataHoraPedido, createdAt, updatedAt]
  );
}

async function applyPedidoItemEvent(db: SQLiteDatabase, event: SyncPackageEvent) {
  const payload = event.payload;
  const pedidoSyncId = typeof payload.pedidoSyncId === 'string' ? payload.pedidoSyncId : '';
  const itemSyncId = typeof payload.itemSyncId === 'string' ? payload.itemSyncId : '';
  const pedido = await findPedidoBySyncId(db, pedidoSyncId);
  const item = await findItemBySyncId(db, itemSyncId);

  if (!pedido || !item) {
    throw new Error('Pedido importado referencia item ou pedido inexistente.');
  }

  const quantidade = typeof payload.quantidade === 'number' ? payload.quantidade : 0;
  const subtotal = typeof payload.subtotal === 'number' ? payload.subtotal : 0;
  const nomeItemSnapshot = typeof payload.nomeItemSnapshot === 'string' ? payload.nomeItemSnapshot : item.nome;
  const valorUnitarioSnapshot =
    typeof payload.valorUnitarioSnapshot === 'number' ? payload.valorUnitarioSnapshot : item.valor;
  const existing = await findPedidoItemBySyncId(db, event.entitySyncId);

  if (quantidade <= 0) {
    if (existing) {
      await db.runAsync('DELETE FROM pedido_itens WHERE id = ?;', [existing.id]);
      await recomputeOrderTotal(db, pedido.id);
    }
    return;
  }

  if (existing) {
    await db.runAsync(
      `UPDATE pedido_itens
       SET pedido_id = ?,
           item_id = ?,
           nome_item_snapshot = ?,
           valor_unitario_snapshot = ?,
           quantidade = ?,
           subtotal = ?
       WHERE id = ?;`,
      [pedido.id, item.id, nomeItemSnapshot, valorUnitarioSnapshot, quantidade, subtotal, existing.id]
    );
  } else {
    await db.runAsync(
      `INSERT INTO pedido_itens (
        sync_id,
        pedido_id,
        item_id,
        numero_item_snapshot,
        nome_item_snapshot,
        valor_unitario_snapshot,
        quantidade,
        subtotal
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?);`,
      [event.entitySyncId, pedido.id, item.id, nomeItemSnapshot, valorUnitarioSnapshot, quantidade, subtotal]
    );
  }

  await recomputeOrderTotal(db, pedido.id);
}

async function applyPedidoFechadoEvent(db: SQLiteDatabase, event: SyncPackageEvent) {
  const payload = event.payload;
  const pedido = await findPedidoBySyncId(db, event.entitySyncId);

  if (!pedido) {
    throw new Error('Pedido a fechar não encontrado durante a importação.');
  }

  const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : event.createdAt;
  await db.runAsync(
    `UPDATE pedidos
     SET status = 'FECHADO_AGUARDANDO_PAGAMENTO',
         updated_at = ?
     WHERE id = ?;`,
    [updatedAt, pedido.id]
  );
}

async function applyPedidoReabertoEvent(db: SQLiteDatabase, event: SyncPackageEvent) {
  const payload = event.payload;
  const pedido = await findPedidoBySyncId(db, event.entitySyncId);

  if (!pedido) {
    throw new Error('Pedido a reabrir não encontrado durante a importação.');
  }

  const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : event.createdAt;
  await db.runAsync(
    `UPDATE pedidos
     SET status = 'ABERTO',
         updated_at = ?
     WHERE id = ?;`,
    [updatedAt, pedido.id]
  );
}

async function applyPedidoPagoEvent(
  db: SQLiteDatabase,
  event: SyncPackageEvent,
  importedBlobsById: Map<string, SyncBlobRecord>
) {
  const payload = event.payload;
  const pedido = await findPedidoBySyncId(db, event.entitySyncId);

  if (!pedido) {
    throw new Error('Pedido a pagar não encontrado durante a importação.');
  }

  const blobId = extractBlobId(payload);
  const blob = importedBlobsById.get(blobId) ?? (blobId ? (await listBlobsByIds([blobId]))[0] : undefined);
  const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : event.createdAt;
  const comprovanteNome = typeof payload.comprovanteNome === 'string' ? payload.comprovanteNome : '';
  const comprovanteMimeType = typeof payload.comprovanteMimeType === 'string' ? payload.comprovanteMimeType : '';
  const comprovanteAdicionadoEm =
    typeof payload.comprovanteAdicionadoEm === 'string' ? payload.comprovanteAdicionadoEm : updatedAt;
  const metodoPagamento = typeof payload.metodoPagamento === 'string' ? payload.metodoPagamento : '';

  await db.runAsync(
    `UPDATE pedidos
     SET status = 'PAGO',
         metodo_pagamento = ?,
         comprovante_uri = ?,
         comprovante_nome = ?,
         comprovante_mime_type = ?,
         comprovante_adicionado_em = ?,
         updated_at = ?
     WHERE id = ?;`,
    [
      metodoPagamento,
      blob?.localUri ?? '',
      comprovanteNome,
      comprovanteMimeType,
      comprovanteAdicionadoEm,
      updatedAt,
      pedido.id,
    ]
  );
}

async function applyPedidoCanceladoEvent(db: SQLiteDatabase, event: SyncPackageEvent) {
  const payload = event.payload;
  const pedido = await findPedidoBySyncId(db, event.entitySyncId);

  if (!pedido) {
    throw new Error('Pedido a cancelar não encontrado durante a importação.');
  }

  const canceladoEm = typeof payload.canceladoEm === 'string' ? payload.canceladoEm : event.createdAt;
  const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : event.createdAt;

  await db.runAsync(
    `UPDATE pedidos
     SET cancelado = 1,
         cancelado_em = ?,
         total = 0,
         updated_at = ?
     WHERE id = ?;`,
    [canceladoEm, updatedAt, pedido.id]
  );
}

async function applyComprovanteAnexadoEvent(
  db: SQLiteDatabase,
  event: SyncPackageEvent,
  importedBlobsById: Map<string, SyncBlobRecord>
) {
  const payload = event.payload;
  const pedido = await findPedidoBySyncId(db, event.entitySyncId);

  if (!pedido) {
    throw new Error('Pedido do comprovante importado não encontrado.');
  }

  const blobId = extractBlobId(payload);
  const blob = importedBlobsById.get(blobId) ?? (blobId ? (await listBlobsByIds([blobId]))[0] : undefined);
  const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : event.createdAt;
  const comprovanteNome = typeof payload.comprovanteNome === 'string' ? payload.comprovanteNome : blob?.nome ?? '';
  const comprovanteMimeType =
    typeof payload.comprovanteMimeType === 'string' ? payload.comprovanteMimeType : blob?.mimeType ?? '';
  const comprovanteAdicionadoEm =
    typeof payload.comprovanteAdicionadoEm === 'string' ? payload.comprovanteAdicionadoEm : updatedAt;

  await db.runAsync(
    `UPDATE pedidos
     SET comprovante_uri = ?,
         comprovante_nome = ?,
         comprovante_mime_type = ?,
         comprovante_adicionado_em = ?,
         updated_at = ?
     WHERE id = ?;`,
    [blob?.localUri ?? '', comprovanteNome, comprovanteMimeType, comprovanteAdicionadoEm, updatedAt, pedido.id]
  );
}

async function applyIncomingEvent(
  db: SQLiteDatabase,
  event: SyncPackageEvent,
  importedBlobsById: Map<string, SyncBlobRecord>
) {
  switch (event.eventType) {
    case 'INTEGRANTE_UPSERTED':
      await applyIntegranteEvent(db, event);
      return;
    case 'ITEM_UPSERTED':
      await applyItemEvent(db, event);
      return;
    case 'PEDIDO_CRIADO':
      await applyPedidoCriadoEvent(db, event);
      return;
    case 'PEDIDO_ITEM_ADICIONADO':
    case 'PEDIDO_ITEM_REMOVIDO':
      await applyPedidoItemEvent(db, event);
      return;
    case 'PEDIDO_FECHADO':
      await applyPedidoFechadoEvent(db, event);
      return;
    case 'PEDIDO_REABERTO':
      await applyPedidoReabertoEvent(db, event);
      return;
    case 'PEDIDO_PAGO':
      await applyPedidoPagoEvent(db, event, importedBlobsById);
      return;
    case 'PEDIDO_CANCELADO':
      await applyPedidoCanceladoEvent(db, event);
      return;
    case 'COMPROVANTE_ANEXADO':
      await applyComprovanteAnexadoEvent(db, event, importedBlobsById);
      return;
    default:
      throw new Error(`Evento de sincronização não suportado: ${event.eventType}`);
  }
}

async function importBlob(
  db: SQLiteDatabase,
  blob: SyncPackageBlob,
  importedBlobsById: Map<string, SyncBlobRecord>
) {
  const existing = await db.getFirstAsync<SyncBlobRow>('SELECT * FROM sync_blobs WHERE hash = ?;', [blob.hash]);

  if (existing) {
    importedBlobsById.set(blob.blobId, mapBlobRow(existing));
    return 0;
  }

  const fileName = `${blob.hash}_${sanitizeLocalFileName(blob.nome || blob.blobId)}`;
  const localUri = await writeBase64FileToAppDirectory('sync-blobs', fileName, blob.base64);

  await registerBlobOnDatabase(db, {
    blobId: blob.blobId,
    nome: blob.nome,
    mimeType: blob.mimeType,
    localUri,
    hash: blob.hash,
    createdAt: blob.createdAt,
  });

  const created = await db.getFirstAsync<SyncBlobRow>('SELECT * FROM sync_blobs WHERE blob_id = ?;', [blob.blobId]);

  if (created) {
    importedBlobsById.set(blob.blobId, mapBlobRow(created));
  }

  return 1;
}

async function buildPreview(syncPackage: SyncPackageFile): Promise<SyncPackagePreview> {
  const local = await getLocalSyncStatus();
  const latestImport = await getLatestImportFromDevice(syncPackage.sourceDevice.deviceId);
  const alreadyImported = await hasImportedPackage(syncPackage.packageId);
  const newEvents = await countMissingEvents(syncPackage.events.map((event) => event.eventId));
  const warnings: string[] = [];

  if (alreadyImported) {
    warnings.push('Este pacote já foi importado.');
  }

  if (local.deviceId && syncPackage.sourceDevice.deviceId === local.deviceId) {
    warnings.push('Este pacote veio do mesmo aparelho.');
  }

  if (latestImport && syncPackage.exportedAt < latestImport.exportedAt) {
    warnings.push('Este pacote é mais antigo que o último importado desta origem.');
  }

  return {
    packageId: syncPackage.packageId,
    exportedAt: syncPackage.exportedAt,
    sourceDeviceId: syncPackage.sourceDevice.deviceId,
    sourceDeviceName: syncPackage.sourceDevice.name,
    totalEvents: syncPackage.events.length,
    newEvents,
    pedidos: countUniqueOrderEvents(syncPackage.events),
    comprovantes: syncPackage.blobs.length,
    integrantes: countUniqueEntityEvents(syncPackage.events, 'INTEGRANTE'),
    itens: countUniqueEntityEvents(syncPackage.events, 'ITEM'),
    warnings,
  };
}

export async function ensureSyncBootstrap() {
  const db = await getDatabase();
  await ensureLocalDeviceIdentity();
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    await assignMissingSyncIds(db);
    await ensureLocalDeviceRegistered(db);
    await backfillIntegranteEvents(db);
    await backfillItemEvents(db);
    await backfillPedidoEvents(db);
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function exportarPacoteSincronizacao() {
  await ensureSyncBootstrap();
  const [configuracao, eventos] = await Promise.all([getConfiguracao(), listSyncEvents()]);
  const blobIds = Array.from(
    new Set(
      eventos
        .map((evento) => extractBlobId(evento.payload))
        .filter((blobId) => Boolean(blobId))
    )
  );
  const blobs = await listBlobsByIds(blobIds);
  const { iso } = getNowParts();
  const syncPackage: SyncPackageFile = {
    schemaVersion: 1,
    packageId: `package_${configuracao.deviceId}_${Date.now().toString(36)}`,
    exportedAt: iso,
    sourceDevice: {
      deviceId: configuracao.deviceId,
      name: configuracao.nomeAparelho,
    },
    events: eventos.map((evento) => ({
      eventId: evento.eventId,
      deviceId: evento.deviceId,
      deviceName: evento.deviceName,
      sequence: evento.sequence,
      entityType: evento.entityType,
      entitySyncId: evento.entitySyncId,
      eventType: evento.eventType,
      payload: evento.payload,
      createdAt: evento.createdAt,
    })),
    blobs: await Promise.all(
      blobs.map(async (blob) => ({
        blobId: blob.blobId,
        nome: blob.nome,
        mimeType: blob.mimeType,
        hash: blob.hash,
        base64: await readFileAsBase64(blob.localUri),
        createdAt: blob.createdAt,
      }))
    ),
  };

  const uri = await writeTextFile(buildPackageFileName(), `${JSON.stringify(syncPackage, null, 2)}\n`);
  const db = await getDatabase();
  await upsertKnownDevice(db, {
    deviceId: configuracao.deviceId,
    nomeAparelho: configuracao.nomeAparelho,
    lastExportedAt: iso,
  });
  await updateLocalSyncTimestamps(db, { lastExportedAt: iso });

  return {
    uri,
    preview: await buildPreview(syncPackage),
  };
}

export async function lerResumoPacoteSincronizacao(uri: string) {
  const syncPackage = await readSyncPackageFile(uri);
  return buildPreview(syncPackage);
}

export async function importarPacoteSincronizacao(uri: string): Promise<SyncImportResult> {
  await ensureSyncBootstrap();
  const syncPackage = await readSyncPackageFile(uri);
  const preview = await buildPreview(syncPackage);

  if (preview.warnings.includes('Este pacote já foi importado.')) {
    throw new Error('Este pacote já foi importado anteriormente.');
  }

  const db = await getDatabase();
  const { iso } = getNowParts();
  const importedBlobsById = new Map<string, SyncBlobRecord>();
  let importedBlobs = 0;
  let importedEvents = 0;

  await db.execAsync('BEGIN TRANSACTION;');

  try {
    await upsertKnownDevice(db, {
      deviceId: syncPackage.sourceDevice.deviceId,
      nomeAparelho: syncPackage.sourceDevice.name,
      lastPackageId: syncPackage.packageId,
      lastExportedAt: syncPackage.exportedAt,
      lastImportedAt: iso,
    });

    for (const blob of syncPackage.blobs) {
      importedBlobs += await importBlob(db, blob, importedBlobsById);
    }

    for (const event of sortPackageEvents(syncPackage.events)) {
      const existing = await db.getFirstAsync<{ found: number }>('SELECT 1 as found FROM sync_events WHERE event_id = ? LIMIT 1;', [
        event.eventId,
      ]);

      if (existing?.found) {
        continue;
      }

      await applyIncomingEvent(db, event, importedBlobsById);
      await insertSyncEvent(db, toEventRow(event));
      importedEvents += 1;
    }

    await recordImportedPackage(db, {
      packageId: syncPackage.packageId,
      sourceDeviceId: syncPackage.sourceDevice.deviceId,
      sourceDeviceName: syncPackage.sourceDevice.name,
      exportedAt: syncPackage.exportedAt,
      importedAt: iso,
      eventCount: syncPackage.events.length,
      blobCount: syncPackage.blobs.length,
    });
    await updateLocalSyncTimestamps(db, { lastImportedAt: iso });
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }

  return {
    importedEvents,
    importedBlobs,
    importedPackages: 1,
    preview,
  };
}

export async function carregarResumoSincronizacao() {
  await ensureSyncBootstrap();
  const [configuracao, devices, imports] = await Promise.all([getConfiguracao(), listKnownDevices(), listSyncImports()]);

  return {
    configuracao,
    devices,
    imports,
  };
}
