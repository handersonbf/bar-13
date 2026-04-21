import { getDatabase } from '../database/connection';
import { Integrante } from '../types/domain';
import { getNowParts } from '../utils/date';
import { normalizeSearch } from '../utils/format';

type IntegranteRow = {
  id: number;
  nome: string;
  patente: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: IntegranteRow): Integrante {
  return {
    id: row.id,
    nome: row.nome,
    patente: row.patente,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listIntegrantes(search = '') {
  const db = await getDatabase();
  const rows = await db.getAllAsync<IntegranteRow>('SELECT * FROM integrantes ORDER BY nome COLLATE NOCASE ASC;');
  const normalized = normalizeSearch(search);

  return rows
    .map(mapRow)
    .filter((integrante) => {
      if (!normalized) {
        return true;
      }

      return normalizeSearch(integrante.nome).includes(normalized);
    });
}

export async function getIntegranteById(id: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<IntegranteRow>('SELECT * FROM integrantes WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

export async function countIntegrantes() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM integrantes;');
  return row?.total ?? 0;
}

export async function upsertIntegrantes(input: { nome: string; patente: string }[]) {
  const db = await getDatabase();
  const existing = await db.getAllAsync<{ nome: string }>('SELECT nome FROM integrantes;');
  const existingSet = new Set(existing.map((item) => normalizeSearch(item.nome)));
  const { iso } = getNowParts();
  let inserted = 0;
  let updated = 0;

  for (const integrante of input) {
    const normalizedName = normalizeSearch(integrante.nome);
    if (existingSet.has(normalizedName)) {
      updated += 1;
    } else {
      inserted += 1;
      existingSet.add(normalizedName);
    }

    await db.runAsync(
      `INSERT INTO integrantes (nome, patente, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(nome) DO UPDATE SET
         nome = excluded.nome,
         patente = excluded.patente,
         updated_at = excluded.updated_at;`,
      [integrante.nome.trim(), integrante.patente.trim(), iso, iso]
    );
  }

  return {
    inserted,
    updated,
    totalProcessed: input.length,
  };
}

export async function clearIntegrantes() {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM pedido_itens;
    DELETE FROM pedidos;
    DELETE FROM integrantes;
  `);
}
