import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database/connection';
import { SyncImportRecord } from '../types/sync';

type SyncImportRow = {
  id: number;
  package_id: string;
  source_device_id: string;
  source_device_name: string;
  exported_at: string;
  imported_at: string;
  event_count: number;
  blob_count: number;
};

function mapRow(row: SyncImportRow): SyncImportRecord {
  return {
    id: row.id,
    packageId: row.package_id,
    sourceDeviceId: row.source_device_id,
    sourceDeviceName: row.source_device_name,
    exportedAt: row.exported_at,
    importedAt: row.imported_at,
    eventCount: row.event_count,
    blobCount: row.blob_count,
  };
}

export async function hasImportedPackage(packageId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ found: number }>('SELECT 1 as found FROM sync_imports WHERE package_id = ? LIMIT 1;', [
    packageId,
  ]);
  return Boolean(row?.found);
}

export async function recordImportedPackage(
  db: SQLiteDatabase,
  input: Omit<SyncImportRecord, 'id'>
) {
  await db.runAsync(
    `INSERT OR IGNORE INTO sync_imports (
      package_id,
      source_device_id,
      source_device_name,
      exported_at,
      imported_at,
      event_count,
      blob_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      input.packageId,
      input.sourceDeviceId,
      input.sourceDeviceName,
      input.exportedAt,
      input.importedAt,
      input.eventCount,
      input.blobCount,
    ]
  );
}

export async function listSyncImports() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SyncImportRow>(
    `SELECT *
     FROM sync_imports
     ORDER BY imported_at DESC, exported_at DESC;`
  );
  return rows.map(mapRow);
}

export async function getLatestImportFromDevice(deviceId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SyncImportRow>(
    `SELECT *
     FROM sync_imports
     WHERE source_device_id = ?
     ORDER BY exported_at DESC, imported_at DESC
     LIMIT 1;`,
    [deviceId]
  );

  return row ? mapRow(row) : null;
}
