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
    ['comprovante_uri', "ALTER TABLE pedidos ADD COLUMN comprovante_uri TEXT NOT NULL DEFAULT '';"],
    ['comprovante_nome', "ALTER TABLE pedidos ADD COLUMN comprovante_nome TEXT NOT NULL DEFAULT '';"],
    ['comprovante_mime_type', "ALTER TABLE pedidos ADD COLUMN comprovante_mime_type TEXT NOT NULL DEFAULT '';"],
    ['comprovante_adicionado_em', "ALTER TABLE pedidos ADD COLUMN comprovante_adicionado_em TEXT NOT NULL DEFAULT '';"],
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

  return db;
}

export async function resetDatabase() {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM pedido_itens;
    DELETE FROM pedidos;
    DELETE FROM itens_bar;
    DELETE FROM integrantes;
    UPDATE configuracoes
    SET chave_pix = '',
        caminho_imagem_qr_code = '',
        nome_bar = 'Bar13',
        texto_padrao_cobranca = 'Bom dia irmão, como você ta ? Aqui e o bar virtual.\nSegue sua conta {data_do_pedido} para pagamento segue a chave pix abaixo.\n\n{chave_pix}\n\n{itens_consumidos_formatados}\n\nTotal: {total_formatado}\n\nEnvio de comprovante abaixo.\nDuvidas do consumido pode perguntar!\nObrigado meu irmão 👊'
    WHERE id = 1;
  `);
}
