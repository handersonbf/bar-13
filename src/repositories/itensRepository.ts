import { getDatabase } from '../database/connection';
import { ItemBar } from '../types/domain';
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
    numeroItem: row.numero_item,
    nome: row.nome,
    valor: row.valor,
    qtdEstoque: row.qtd_estoque,
    ativo: Boolean(row.ativo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listItens(search = '') {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ItemRow>(
    'SELECT * FROM itens_bar WHERE ativo = 1 ORDER BY numero_item ASC, nome COLLATE NOCASE ASC;'
  );
  const normalized = normalizeSearch(search);

  return rows
    .map(mapRow)
    .filter((item) => {
      if (!normalized) {
        return true;
      }

      return (
        normalizeSearch(item.nome).includes(normalized) ||
        String(item.numeroItem).includes(normalized.replace(/\D/g, ''))
      );
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

export async function upsertItens(input: { numeroItem: number; nome: string; valor: number; qtdEstoque: number }[]) {
  const db = await getDatabase();
  const existing = await db.getAllAsync<{ numero_item: number }>('SELECT numero_item FROM itens_bar;');
  const existingSet = new Set(existing.map((item) => item.numero_item));
  const { iso } = getNowParts();
  let inserted = 0;
  let updated = 0;

  for (const item of input) {
    if (existingSet.has(item.numeroItem)) {
      updated += 1;
    } else {
      inserted += 1;
      existingSet.add(item.numeroItem);
    }

    await db.runAsync(
      `INSERT INTO itens_bar (numero_item, nome, valor, qtd_estoque, ativo, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(numero_item) DO UPDATE SET
         nome = excluded.nome,
         valor = excluded.valor,
         qtd_estoque = excluded.qtd_estoque,
         ativo = 1,
         updated_at = excluded.updated_at;`,
      [item.numeroItem, item.nome.trim(), item.valor, item.qtdEstoque, iso, iso]
    );
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
