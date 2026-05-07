import { getDatabase } from '../database/connection';
import { CentralPushBatch, CentralPushStatus } from '../types/domain';
import { getNowParts } from '../utils/date';

type CentralPushBatchRow = {
  id: number;
  batch_id: string;
  status: CentralPushStatus;
  payload_json: string;
  response_json: string;
  error_message: string;
  created_at: string;
  last_attempt_at: string;
  last_success_at: string;
};

function mapRow(row: CentralPushBatchRow): CentralPushBatch {
  return {
    id: row.id,
    batchId: row.batch_id,
    status: row.status,
    payloadJson: row.payload_json,
    responseJson: row.response_json,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    lastAttemptAt: row.last_attempt_at,
    lastSuccessAt: row.last_success_at,
  };
}

export async function createCentralPushBatch(batchId: string, payloadJson: string) {
  const db = await getDatabase();
  const { iso } = getNowParts();

  await db.runAsync(
    `INSERT INTO central_push_batches (
      batch_id,
      status,
      payload_json,
      created_at
    ) VALUES (?, 'PENDENTE', ?, ?);`,
    [batchId, payloadJson, iso]
  );

  const row = await db.getFirstAsync<CentralPushBatchRow>('SELECT * FROM central_push_batches WHERE batch_id = ?;', [batchId]);

  if (!row) {
    throw new Error('Não foi possível registrar o lote de envio da central.');
  }

  return mapRow(row);
}

export async function listPendingCentralPushBatches() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CentralPushBatchRow>(
    `SELECT *
     FROM central_push_batches
     WHERE status IN ('PENDENTE', 'ERRO')
     ORDER BY created_at ASC, id ASC;`
  );
  return rows.map(mapRow);
}

export async function getLatestCentralPushBatch() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CentralPushBatchRow>(
    `SELECT *
     FROM central_push_batches
     ORDER BY created_at DESC, id DESC
     LIMIT 1;`
  );
  return row ? mapRow(row) : null;
}

export async function countPendingCentralPushBatches() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total
     FROM central_push_batches
     WHERE status IN ('PENDENTE', 'ERRO');`
  );
  return row?.total ?? 0;
}

export async function markCentralPushBatchAttempt(batchId: string) {
  const db = await getDatabase();
  const { iso } = getNowParts();
  await db.runAsync(
    `UPDATE central_push_batches
     SET last_attempt_at = ?
     WHERE batch_id = ?;`,
    [iso, batchId]
  );
}

export async function markCentralPushBatchSuccess(batchId: string, responseJson: string) {
  const db = await getDatabase();
  const { iso } = getNowParts();
  await db.runAsync(
    `UPDATE central_push_batches
     SET status = 'ENVIADO',
         response_json = ?,
         error_message = '',
         last_attempt_at = ?,
         last_success_at = ?
     WHERE batch_id = ?;`,
    [responseJson, iso, iso, batchId]
  );
}

export async function markCentralPushBatchError(batchId: string, errorMessage: string) {
  const db = await getDatabase();
  const { iso } = getNowParts();
  await db.runAsync(
    `UPDATE central_push_batches
     SET status = 'ERRO',
         error_message = ?,
         last_attempt_at = ?
     WHERE batch_id = ?;`,
    [errorMessage, iso, batchId]
  );
}
