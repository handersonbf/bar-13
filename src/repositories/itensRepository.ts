import { getDatabase } from '../database/connection';
import { ItemBar, ItemBarInput } from '../types/domain';
import { getNowParts } from '../utils/date';
import { normalizeSearch } from '../utils/format';

type ItemRow = {
  id: number;
  numero_item: number;
  nome: string;
  valor: number;
  qtd_estoque: number;
  ativo: number;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ItemRow): ItemBar {
  return {
    id: row.id,
    nome: row.nome,
    valor: row.valor,
    qtdEstoque: row.qtd_estoque,
    ativo: Boolean(row.ativo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function prepareItemInput(input: ItemBarInput) {
  const nome = input.nome.trim().replace(/\s+/g, ' ');

  if (!nome) {
    throw new Error('Informe o nome do item.');
  }

  if (!Number.isFinite(input.valor) || input.valor <= 0) {
    throw new Error('Informe um valor válido maior que zero.');
  }

  if (!Number.isInteger(input.qtdEstoque) || input.qtdEstoque < 0) {
    throw new Error('Informe um estoque inteiro maior ou igual a zero.');
  }

  return {
    nome,
    normalizedName: normalizeSearch(nome),
    valor: input.valor,
    qtdEstoque: input.qtdEstoque,
  };
}

function indexRowsByNome(rows: ItemRow[]) {
  const indexed = new Map<string, ItemRow>();

  rows.forEach((row) => {
    indexed.set(normalizeSearch(row.nome), row);
  });

  return indexed;
}

function getNextNumeroItem(rows: ItemRow[]) {
  return rows.reduce((maxValue, row) => Math.max(maxValue, row.numero_item), 0) + 1;
}

export async function listItens(search = '') {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ItemRow>('SELECT * FROM itens_bar WHERE ativo = 1 ORDER BY nome COLLATE NOCASE ASC;');
  const normalized = normalizeSearch(search);

  return rows
    .map(mapRow)
    .filter((item) => {
      if (!normalized) {
        return true;
      }

      return normalizeSearch(item.nome).includes(normalized);
    });
}

export async function getItemById(id: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ItemRow>('SELECT * FROM itens_bar WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

export async function countItens() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM itens_bar WHERE ativo = 1;');
  return row?.total ?? 0;
}

export async function createItem(input: ItemBarInput) {
  const db = await getDatabase();
  const item = prepareItemInput(input);
  const existingRows = await db.getAllAsync<ItemRow>('SELECT * FROM itens_bar;');
  const duplicated = existingRows.find((row) => normalizeSearch(row.nome) === item.normalizedName);

  if (duplicated) {
    throw new Error('Já existe um item com esse nome.');
  }

  const { iso } = getNowParts();
  const nextNumeroItem = getNextNumeroItem(existingRows);
  const result = await db.runAsync(
    `INSERT INTO itens_bar (numero_item, nome, valor, qtd_estoque, ativo, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?);`,
    [nextNumeroItem, item.nome, item.valor, item.qtdEstoque, iso, iso]
  );

  const created = await getItemById(Number(result.lastInsertRowId));

  if (!created) {
    throw new Error('Não foi possível carregar o item cadastrado.');
  }

  return created;
}

export async function updateItem(id: number, input: ItemBarInput) {
  const db = await getDatabase();
  const item = prepareItemInput(input);
  const current = await getItemById(id);

  if (!current) {
    throw new Error('Item não encontrado.');
  }

  const existingRows = await db.getAllAsync<ItemRow>('SELECT * FROM itens_bar;');
  const duplicated = existingRows.find((row) => row.id !== id && normalizeSearch(row.nome) === item.normalizedName);

  if (duplicated) {
    throw new Error('Já existe outro item com esse nome.');
  }

  const { iso } = getNowParts();
  await db.runAsync(
    'UPDATE itens_bar SET nome = ?, valor = ?, qtd_estoque = ?, updated_at = ? WHERE id = ?;',
    [item.nome, item.valor, item.qtdEstoque, iso, id]
  );

  const updated = await getItemById(id);

  if (!updated) {
    throw new Error('Não foi possível carregar o item atualizado.');
  }

  return updated;
}

export async function deleteItem(id: number) {
  const db = await getDatabase();
  const current = await getItemById(id);

  if (!current) {
    throw new Error('Item não encontrado.');
  }

  const linkedOrders = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM pedido_itens WHERE item_id = ?;',
    [id]
  );

  if ((linkedOrders?.total ?? 0) > 0) {
    throw new Error('Não é possível excluir um item que já foi usado em pedidos no histórico.');
  }

  await db.runAsync('DELETE FROM itens_bar WHERE id = ?;', [id]);
}

export async function upsertItens(input: ItemBarInput[]) {
  const db = await getDatabase();
  const existingRows = await db.getAllAsync<ItemRow>('SELECT * FROM itens_bar;');
  const existingByNome = indexRowsByNome(existingRows);
  let nextNumeroItem = getNextNumeroItem(existingRows);
  const { iso } = getNowParts();
  let inserted = 0;
  let updated = 0;

  for (const rawItem of input) {
    const item = prepareItemInput(rawItem);
    const existing = existingByNome.get(item.normalizedName);

    if (existing) {
      updated += 1;

      await db.runAsync(
        'UPDATE itens_bar SET nome = ?, valor = ?, qtd_estoque = ?, ativo = 1, updated_at = ? WHERE id = ?;',
        [item.nome, item.valor, item.qtdEstoque, iso, existing.id]
      );

      existingByNome.set(item.normalizedName, {
        ...existing,
        nome: item.nome,
        valor: item.valor,
        qtd_estoque: item.qtdEstoque,
        ativo: 1,
        updated_at: iso,
      });
    } else {
      inserted += 1;
      const result = await db.runAsync(
        `INSERT INTO itens_bar (numero_item, nome, valor, qtd_estoque, ativo, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?);`,
        [nextNumeroItem, item.nome, item.valor, item.qtdEstoque, iso, iso]
      );

      existingByNome.set(item.normalizedName, {
        id: Number(result.lastInsertRowId),
        numero_item: nextNumeroItem,
        nome: item.nome,
        valor: item.valor,
        qtd_estoque: item.qtdEstoque,
        ativo: 1,
        created_at: iso,
        updated_at: iso,
      });
      nextNumeroItem += 1;
    }
  }

  return {
    inserted,
    updated,
    totalProcessed: input.length,
  };
}

export async function clearItens() {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM pedido_itens;
    DELETE FROM pedidos;
    DELETE FROM itens_bar;
  `);
}

export async function getItensByIds(ids: number[]) {
  if (ids.length === 0) {
    return [];
  }

  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db.getAllAsync<ItemRow>(`SELECT * FROM itens_bar WHERE id IN (${placeholders});`, ids);
  return rows.map(mapRow);
}
