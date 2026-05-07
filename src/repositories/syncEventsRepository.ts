import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database/connection';
import { getNowParts } from '../utils/date';
import { KnownDevice, SyncEntityType, SyncEventRecord, SyncEventType } from '../types/sync';

type ConfigSyncRow = {
  device_id: string;
  nome_aparelho: string;
  operador_atual_sync_id: string;
  operador_atual_nome: string;
  sync_sequence: number;
  last_exported_at: string;
  last_imported_at: string;
};

type SyncEventRow = {
  id: number;
  event_id: string;
  device_id: string;
  device_name: string;
  sequence: number;
  entity_type: SyncEntityType;
  entity_sync_id: string;
  event_type: SyncEventType;
  actor_operator_sync_id: string;
  actor_operator_name: string;
  payload_json: string;
  created_at: string;
};

type KnownDeviceRow = {
  device_id: string;
  nome_aparelho: string;
  first_seen_at: string;
  last_seen_at: string;
  last_package_id: string;
  last_exported_at: string;
  last_imported_at: string;
};

type LocalIdentity = {
  deviceId: string;
  deviceName: string;
};

export type LocalEventMetadata = LocalIdentity & {
  sequence: number;
  eventId: string;
  actorOperatorSyncId: string;
  actorOperatorName: string;
  createdAt: string;
};

function mapEventRow(row: SyncEventRow): SyncEventRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    sequence: row.sequence,
    entityType: row.entity_type,
    entitySyncId: row.entity_sync_id,
    eventType: row.event_type,
    actorOperatorSyncId: row.actor_operator_sync_id,
    actorOperatorName: row.actor_operator_name,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

function mapKnownDevice(row: KnownDeviceRow): KnownDevice {
  return {
    deviceId: row.device_id,
    nomeAparelho: row.nome_aparelho,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    lastPackageId: row.last_package_id,
    lastExportedAt: row.last_exported_at,
    lastImportedAt: row.last_imported_at,
  };
}

function buildDeviceId() {
  return `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getDeviceFragment(deviceId: string) {
  const clean = deviceId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return clean.slice(-6).padStart(6, '0');
}

export function buildEntitySyncId(entityPrefix: string, deviceId: string, sequence: number) {
  return `${entityPrefix}_${getDeviceFragment(deviceId)}_${sequence.toString().padStart(6, '0')}`;
}

function buildEventId(deviceId: string, sequence: number) {
  return `event_${getDeviceFragment(deviceId)}_${sequence.toString().padStart(6, '0')}`;
}

async function getConfigSyncRow(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<ConfigSyncRow>(
    `SELECT device_id, nome_aparelho, operador_atual_sync_id, operador_atual_nome, sync_sequence, last_exported_at, last_imported_at
     FROM configuracoes
     WHERE id = 1;`
  );

  if (!row) {
    throw new Error('Configuração principal não encontrada para sincronização.');
  }

  return row;
}

async function ensureLocalIdentityOnDatabase(db: SQLiteDatabase): Promise<LocalIdentity> {
  const current = await getConfigSyncRow(db);

  if (current.device_id) {
    return {
      deviceId: current.device_id,
      deviceName: current.nome_aparelho || 'Caixa',
    };
  }

  const nextDeviceId = buildDeviceId();
  await db.runAsync('UPDATE configuracoes SET device_id = ?, nome_aparelho = COALESCE(NULLIF(nome_aparelho, \'\'), \'Caixa\') WHERE id = 1;', [
    nextDeviceId,
  ]);

  return {
    deviceId: nextDeviceId,
    deviceName: current.nome_aparelho || 'Caixa',
  };
}

export async function ensureLocalDeviceIdentity() {
  const db = await getDatabase();
  return ensureLocalIdentityOnDatabase(db);
}

export async function getNextLocalEventMetadata(db: SQLiteDatabase): Promise<LocalEventMetadata> {
  const identity = await ensureLocalIdentityOnDatabase(db);
  const current = await getConfigSyncRow(db);
  const nextSequence = current.sync_sequence + 1;
  const { iso } = getNowParts();

  await db.runAsync('UPDATE configuracoes SET sync_sequence = ? WHERE id = 1;', [nextSequence]);

  return {
    ...identity,
    sequence: nextSequence,
    eventId: buildEventId(identity.deviceId, nextSequence),
    actorOperatorSyncId: current.operador_atual_sync_id,
    actorOperatorName: current.operador_atual_nome,
    createdAt: iso,
  };
}

export async function insertSyncEvent(
  db: SQLiteDatabase,
  input: Omit<SyncEventRecord, 'id'>
) {
  await db.runAsync(
    `INSERT OR IGNORE INTO sync_events (
      event_id,
      device_id,
      device_name,
      sequence,
      entity_type,
      entity_sync_id,
      event_type,
      actor_operator_sync_id,
      actor_operator_name,
      payload_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      input.eventId,
      input.deviceId,
      input.deviceName,
      input.sequence,
      input.entityType,
      input.entitySyncId,
      input.eventType,
      input.actorOperatorSyncId,
      input.actorOperatorName,
      JSON.stringify(input.payload),
      input.createdAt,
    ]
  );
}

export async function recordLocalSyncEvent(
  db: SQLiteDatabase,
  params: {
    metadata: LocalEventMetadata;
    entityType: SyncEntityType;
    entitySyncId: string;
    eventType: SyncEventType;
    payload: Record<string, unknown>;
  }
) {
  await insertSyncEvent(db, {
    eventId: params.metadata.eventId,
    deviceId: params.metadata.deviceId,
    deviceName: params.metadata.deviceName,
    sequence: params.metadata.sequence,
    entityType: params.entityType,
    entitySyncId: params.entitySyncId,
    eventType: params.eventType,
    actorOperatorSyncId: params.metadata.actorOperatorSyncId,
    actorOperatorName: params.metadata.actorOperatorName,
    payload: params.payload,
    createdAt: params.metadata.createdAt,
  });
}

export async function listSyncEvents() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SyncEventRow>(
    `SELECT *
     FROM sync_events
     ORDER BY created_at ASC, device_id ASC, sequence ASC;`
  );
  return rows.map(mapEventRow);
}

export async function hasSyncEvent(eventId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ found: number }>('SELECT 1 as found FROM sync_events WHERE event_id = ? LIMIT 1;', [
    eventId,
  ]);
  return Boolean(row?.found);
}

export async function countMissingEvents(eventIds: string[]) {
  if (eventIds.length === 0) {
    return 0;
  }

  const db = await getDatabase();
  const placeholders = eventIds.map(() => '?').join(', ');
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total
     FROM sync_events
     WHERE event_id IN (${placeholders});`,
    eventIds
  );

  return eventIds.length - (row?.total ?? 0);
}

export async function listKnownDevices() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<KnownDeviceRow>(
    'SELECT * FROM known_devices ORDER BY nome_aparelho COLLATE NOCASE ASC, device_id ASC;'
  );
  return rows.map(mapKnownDevice);
}

export async function upsertKnownDevice(
  db: SQLiteDatabase,
  input: {
    deviceId: string;
    nomeAparelho: string;
    lastPackageId?: string;
    lastExportedAt?: string;
    lastImportedAt?: string;
  }
) {
  const { iso } = getNowParts();
  await db.runAsync(
    `INSERT INTO known_devices (
      device_id,
      nome_aparelho,
      first_seen_at,
      last_seen_at,
      last_package_id,
      last_exported_at,
      last_imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      nome_aparelho = excluded.nome_aparelho,
      last_seen_at = excluded.last_seen_at,
      last_package_id = CASE
        WHEN excluded.last_package_id != '' THEN excluded.last_package_id
        ELSE known_devices.last_package_id
      END,
      last_exported_at = CASE
        WHEN excluded.last_exported_at != '' THEN excluded.last_exported_at
        ELSE known_devices.last_exported_at
      END,
      last_imported_at = CASE
        WHEN excluded.last_imported_at != '' THEN excluded.last_imported_at
        ELSE known_devices.last_imported_at
      END;`,
    [
      input.deviceId,
      input.nomeAparelho,
      iso,
      iso,
      input.lastPackageId ?? '',
      input.lastExportedAt ?? '',
      input.lastImportedAt ?? '',
    ]
  );
}

export async function updateLocalSyncTimestamps(
  db: SQLiteDatabase,
  input: {
    lastExportedAt?: string;
    lastImportedAt?: string;
  }
) {
  const current = await getConfigSyncRow(db);

  await db.runAsync(
    `UPDATE configuracoes
     SET last_exported_at = ?,
         last_imported_at = ?
     WHERE id = 1;`,
    [input.lastExportedAt ?? current.last_exported_at, input.lastImportedAt ?? current.last_imported_at]
  );
}

export async function getLocalSyncStatus() {
  const db = await getDatabase();
  const config = await getConfigSyncRow(db);

  return {
    deviceId: config.device_id,
    nomeAparelho: config.nome_aparelho || 'Caixa',
    syncSequence: config.sync_sequence,
    lastExportedAt: config.last_exported_at,
    lastImportedAt: config.last_imported_at,
  };
}

export async function getLatestKnownDeviceImport(deviceId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<KnownDeviceRow>('SELECT * FROM known_devices WHERE device_id = ?;', [deviceId]);
  return row ? mapKnownDevice(row) : null;
}
