export const schemaStatements = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS integrantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
    patente TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS itens_bar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_item INTEGER NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    valor REAL NOT NULL,
    qtd_estoque INTEGER NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integrante_id INTEGER NOT NULL,
    nome_integrante_snapshot TEXT NOT NULL,
    patente_integrante_snapshot TEXT NOT NULL,
    data_pedido TEXT NOT NULL,
    hora_pedido TEXT NOT NULL,
    data_hora_pedido TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('ABERTO', 'FECHADO_AGUARDANDO_PAGAMENTO', 'PAGO')),
    total REAL NOT NULL DEFAULT 0,
    cancelado INTEGER NOT NULL DEFAULT 0,
    cancelado_em TEXT NOT NULL DEFAULT '',
    metodo_pagamento TEXT NOT NULL DEFAULT '',
    comprovante_uri TEXT NOT NULL DEFAULT '',
    comprovante_nome TEXT NOT NULL DEFAULT '',
    comprovante_mime_type TEXT NOT NULL DEFAULT '',
    comprovante_adicionado_em TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (integrante_id) REFERENCES integrantes(id)
  );`,
  `CREATE TABLE IF NOT EXISTS pedido_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    numero_item_snapshot INTEGER NOT NULL,
    nome_item_snapshot TEXT NOT NULL,
    valor_unitario_snapshot REAL NOT NULL,
    quantidade INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES itens_bar(id)
  );`,
  `CREATE TABLE IF NOT EXISTS configuracoes (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    chave_pix TEXT NOT NULL DEFAULT '',
    caminho_imagem_qr_code TEXT NOT NULL DEFAULT '',
    nome_bar TEXT NOT NULL DEFAULT 'Bar13',
    texto_padrao_cobranca TEXT NOT NULL DEFAULT ''
  );`,
  `CREATE INDEX IF NOT EXISTS idx_pedidos_data_pedido ON pedidos(data_pedido);`,
  `CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);`,
  `CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido_id ON pedido_itens(pedido_id);`,
  `INSERT OR IGNORE INTO configuracoes (id, chave_pix, caminho_imagem_qr_code, nome_bar, texto_padrao_cobranca)
   VALUES (1, '', '', 'Bar13', 'Bom dia irmão, como você ta ? Aqui e o bar virtual.\nSegue sua conta {data_do_pedido} para pagamento segue a chave pix abaixo.\n\n{chave_pix}\n\n{itens_consumidos_formatados}\n\nTotal: {total_formatado}\n\nEnvio de comprovante abaixo.\nDuvidas do consumido pode perguntar!\nObrigado meu irmão 👊');`,
];
