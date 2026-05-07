import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database/connection';
import { SyncBlobRecord } from '../types/sync';
import { getNowParts } from '../utils/date';
import { hashString } from '../utils/hash';
import { buildEntitySyncId, getNextLocalEventMetadata } from './syncEventsRepository';

type SyncBlobRow = {
  id: number;
  blob_id: string;
  nome: string;
  mime_type: string;
  local_uri: string;
  hash: string;
  created_at: string;
};

function mapRow(row: SyncBlobRow): SyncBlobRecord {
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

export async function getBlobByHash(hash: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SyncBlobRow>('SELECT * FROM sync_blobs WHERE hash = ?;', [hash]);
  return row ? mapRow(row) : null;
}

export async function getBlobById(blobId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SyncBlobRow>('SELECT * FROM sync_blobs WHERE blob_id = ?;', [blobId]);
  return row ? mapRow(row) : null;
}

export async function listBlobsByIds(blobIds: string[]) {
  if (blobIds.length === 0) {
    return [];
  }

  const db = await getDatabase();
  const placeholders = blobIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<SyncBlobRow>(`SELECT * FROM sync_blobs WHERE blob_id IN (${placeholders});`, blobIds);
  return rows.map(mapRow);
}

export async function registerBlobOnDatabase(
  db: SQLiteDatabase,
  input: {
    blobId: string;
    nome: string;
    mimeType: string;
    localUri: string;
    hash: string;
    createdAt: string;
  }
) {
  await db.runAsync(
    `INSERT OR IGNORE INTO sync_blobs (
      blob_id,
      nome,
      mime_type,
      local_uri,
      hash,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?);`,
    [input.blobId, input.nome, input.mimeType, input.localUri, input.hash, input.createdAt]
  );
}

export async function ensureBlobForAttachmentOnDatabase(
  db: SQLiteDatabase,
  input: {
    nome: string;
    mimeType: string;
    localUri: string;
    base64: string;
  }
) {
  const hash = hashString(input.base64);
  const existing = await db.getFirstAsync<SyncBlobRow>('SELECT * FROM sync_blobs WHERE hash = ?;', [hash]);

  if (existing) {
    return mapRow(existing);
  }

  const metadata = await getNextLocalEventMetadata(db);
  const { iso } = getNowParts();
  const blobId = buildEntitySyncId('blob', metadata.deviceId, metadata.sequence);

  await registerBlobOnDatabase(db, {
    blobId,
    nome: input.nome,
    mimeType: input.mimeType,
    localUri: input.localUri,
    hash,
    createdAt: iso,
  });

  const created = await db.getFirstAsync<SyncBlobRow>('SELECT * FROM sync_blobs WHERE blob_id = ?;', [blobId]);

  if (!created) {
    throw new Error('Não foi possível registrar o comprovante para sincronização.');
  }

  return mapRow(created);
}

export async function ensureBlobForAttachment(input: {
  nome: string;
  mimeType: string;
  localUri: string;
  base64: string;
}) {
  const db = await getDatabase();
  return ensureBlobForAttachmentOnDatabase(db, input);
}
