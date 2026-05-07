import * as SQLite from 'expo-sqlite';
import { schemaStatements } from './migrations';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('bar13.db');
  }

  return databasePromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();
  for (const statement of schemaStatements) {
    await db.execAsync(statement);
  }

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(pedidos);');
  const columnNames = new Set(columns.map((column) => column.name));
  const pendingColumns = [
    ['metodo_pagamento', "ALTER TABLE pedidos ADD COLUMN metodo_pagamento TEXT NOT NULL DEFAULT '';"],
    ['comprovante_uri', "ALTER TABLE pedidos ADD COLUMN comprovante_uri TEXT NOT NULL DEFAULT '';"],
    ['comprovante_nome', "ALTER TABLE pedidos ADD COLUMN comprovante_nome TEXT NOT NULL DEFAULT '';"],
    ['comprovante_mime_type', "ALTER TABLE pedidos ADD COLUMN comprovante_mime_type TEXT NOT NULL DEFAULT '';"],
    ['comprovante_adicionado_em', "ALTER TABLE pedidos ADD COLUMN comprovante_adicionado_em TEXT NOT NULL DEFAULT '';"],
    ['sync_id', "ALTER TABLE pedidos ADD COLUMN sync_id TEXT NOT NULL DEFAULT '';"],
    ['operador_sync_id_snapshot', "ALTER TABLE pedidos ADD COLUMN operador_sync_id_snapshot TEXT NOT NULL DEFAULT '';"],
    ['nome_operador_snapshot', "ALTER TABLE pedidos ADD COLUMN nome_operador_snapshot TEXT NOT NULL DEFAULT '';"],
    ['device_id_origem', "ALTER TABLE pedidos ADD COLUMN device_id_origem TEXT NOT NULL DEFAULT '';"],
  ] as const;

  for (const [columnName, statement] of pendingColumns) {
    if (!columnNames.has(columnName)) {
      await db.execAsync(statement);
    }
  }

  const pedidoExtraColumns = [
    ['cancelado', "ALTER TABLE pedidos ADD COLUMN cancelado INTEGER NOT NULL DEFAULT 0;"],
    ['cancelado_em', "ALTER TABLE pedidos ADD COLUMN cancelado_em TEXT NOT NULL DEFAULT '';"],
  ] as const;

  for (const [columnName, statement] of pedidoExtraColumns) {
    if (!columnNames.has(columnName)) {
      await db.execAsync(statement);
    }
  }

  const itemColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(itens_bar);');
  const itemColumnNames = new Set(itemColumns.map((column) => column.name));
  if (!itemColumnNames.has('qtd_estoque')) {
    await db.execAsync("ALTER TABLE itens_bar ADD COLUMN qtd_estoque INTEGER NOT NULL DEFAULT 0;");
  }
  if (!itemColumnNames.has('sync_id')) {
    await db.execAsync("ALTER TABLE itens_bar ADD COLUMN sync_id TEXT NOT NULL DEFAULT '';");
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS operadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_id TEXT NOT NULL DEFAULT '',
      nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const integranteColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(integrantes);');
  const integranteColumnNames = new Set(integranteColumns.map((column) => column.name));
  if (!integranteColumnNames.has('sync_id')) {
    await db.execAsync("ALTER TABLE integrantes ADD COLUMN sync_id TEXT NOT NULL DEFAULT '';");
  }

  const pedidoItemColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(pedido_itens);');
  const pedidoItemColumnNames = new Set(pedidoItemColumns.map((column) => column.name));
  if (!pedidoItemColumnNames.has('sync_id')) {
    await db.execAsync("ALTER TABLE pedido_itens ADD COLUMN sync_id TEXT NOT NULL DEFAULT '';");
  }

  const configColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(configuracoes);');
  const configColumnNames = new Set(configColumns.map((column) => column.name));
  const pendingConfigColumns = [
    ['device_id', "ALTER TABLE configuracoes ADD COLUMN device_id TEXT NOT NULL DEFAULT '';"],
    ['nome_aparelho', "ALTER TABLE configuracoes ADD COLUMN nome_aparelho TEXT NOT NULL DEFAULT 'Caixa';"],
    ['operador_atual_sync_id', "ALTER TABLE configuracoes ADD COLUMN operador_atual_sync_id TEXT NOT NULL DEFAULT '';"],
    ['operador_atual_nome', "ALTER TABLE configuracoes ADD COLUMN operador_atual_nome TEXT NOT NULL DEFAULT '';"],
    ['sync_sequence', 'ALTER TABLE configuracoes ADD COLUMN sync_sequence INTEGER NOT NULL DEFAULT 0;'],
    ['central_web_app_url', "ALTER TABLE configuracoes ADD COLUMN central_web_app_url TEXT NOT NULL DEFAULT '';"],
    ['central_token', "ALTER TABLE configuracoes ADD COLUMN central_token TEXT NOT NULL DEFAULT '';"],
    ['last_exported_at', "ALTER TABLE configuracoes ADD COLUMN last_exported_at TEXT NOT NULL DEFAULT '';"],
    ['last_imported_at', "ALTER TABLE configuracoes ADD COLUMN last_imported_at TEXT NOT NULL DEFAULT '';"],
  ] as const;

  for (const [columnName, statement] of pendingConfigColumns) {
    if (!configColumnNames.has(columnName)) {
      await db.execAsync(statement);
    }
  }

  const syncEventColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sync_events);');
  const syncEventColumnNames = new Set(syncEventColumns.map((column) => column.name));
  const pendingSyncEventColumns = [
    ['actor_operator_sync_id', "ALTER TABLE sync_events ADD COLUMN actor_operator_sync_id TEXT NOT NULL DEFAULT '';"],
    ['actor_operator_name', "ALTER TABLE sync_events ADD COLUMN actor_operator_name TEXT NOT NULL DEFAULT '';"],
  ] as const;

  for (const [columnName, statement] of pendingSyncEventColumns) {
    if (!syncEventColumnNames.has(columnName)) {
      await db.execAsync(statement);
    }
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS central_push_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      response_json TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      last_attempt_at TEXT NOT NULL DEFAULT '',
      last_success_at TEXT NOT NULL DEFAULT ''
    );
  `);

  await db.execAsync("CREATE UNIQUE INDEX IF NOT EXISTS idx_integrantes_sync_id ON integrantes(sync_id) WHERE sync_id != '';");
  await db.execAsync("CREATE UNIQUE INDEX IF NOT EXISTS idx_itens_bar_sync_id ON itens_bar(sync_id) WHERE sync_id != '';");
  await db.execAsync("CREATE UNIQUE INDEX IF NOT EXISTS idx_operadores_sync_id ON operadores(sync_id) WHERE sync_id != '';");
  await db.execAsync("CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_sync_id ON pedidos(sync_id) WHERE sync_id != '';");
  await db.execAsync("CREATE UNIQUE INDEX IF NOT EXISTS idx_pedido_itens_sync_id ON pedido_itens(sync_id) WHERE sync_id != '';");
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_central_push_batches_status ON central_push_batches(status, created_at);');

  return db;
}

export async function resetDatabase() {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM pedido_itens;
    DELETE FROM pedidos;
    DELETE FROM itens_bar;
    DELETE FROM integrantes;
    DELETE FROM operadores;
    DELETE FROM sync_events;
    DELETE FROM sync_imports;
    DELETE FROM known_devices;
    DELETE FROM sync_blobs;
    DELETE FROM central_push_batches;
    UPDATE configuracoes
    SET nome_aparelho = COALESCE(NULLIF(nome_aparelho, ''), 'Caixa'),
        operador_atual_sync_id = '',
        operador_atual_nome = '',
        chave_pix = '',
        caminho_imagem_qr_code = '',
        nome_bar = 'Bar13',
        texto_padrao_cobranca = 'Bom dia irmão, como você ta ? Aqui e o bar virtual.\nSegue sua conta {data_do_pedido} para pagamento segue a chave pix abaixo.\n\n{chave_pix}\n\n{itens_consumidos_formatados}\n\nTotal: {total_formatado}\n\nEnvio de comprovante abaixo.\nDuvidas do consumido pode perguntar!\nObrigado meu irmão 👊',
        central_web_app_url = '',
        central_token = '',
        last_exported_at = '',
        last_imported_at = ''
    WHERE id = 1;
  `);
}
