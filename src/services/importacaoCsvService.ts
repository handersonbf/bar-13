import { CsvImportResult, CsvIntegranteRow, CsvItemRow } from '../types/domain';
import { parseCsv } from '../utils/csv';
import { requireHeaders, parseCurrencyInput } from '../utils/validation';
import { upsertIntegrantes } from '../repositories/integrantesRepository';
import { upsertItens } from '../repositories/itensRepository';
import { normalizeSearch } from '../utils/format';

function validateIntegrantes(rows: Record<string, string>[]): CsvIntegranteRow[] {
  return rows.map((row, index) => {
    const nome = row.nome?.trim();
    const patente = row.patente?.trim().toUpperCase();

    if (!nome || !patente) {
      throw new Error(`Linha ${index + 2}: nome e patente são obrigatórios.`);
    }

    return {
      nome,
      patente,
    };
  });
}

function validateItens(rows: Record<string, string>[]): CsvItemRow[] {
  return rows.map((row, index) => {
    const nome = row.nome?.trim();
    const valor = row.valor?.trim();
    const qtdestoque = row.qtdestoque?.trim();

    if (!nome || !valor || !qtdestoque) {
      throw new Error(`Linha ${index + 2}: nome, valor e qtdestoque são obrigatórios.`);
    }

    return {
      nome,
      valor,
      qtdestoque,
    };
  });
}

function dedupeIntegrantes(rows: CsvIntegranteRow[]) {
  const deduped = new Map<string, CsvIntegranteRow>();

  rows.forEach((row) => {
    deduped.set(normalizeSearch(row.nome), row);
  });

  return Array.from(deduped.values());
}

function dedupeItens(rows: { nome: string; valor: number; qtdEstoque: number }[]) {
  const deduped = new Map<string, { nome: string; valor: number; qtdEstoque: number }>();

  rows.forEach((row) => {
    deduped.set(normalizeSearch(row.nome), row);
  });

  return Array.from(deduped.values());
}

export async function importIntegrantesCsv(content: string): Promise<CsvImportResult> {
  const { headers, rows } = parseCsv(content);
  requireHeaders(headers, ['nome', 'patente']);
  const payload = dedupeIntegrantes(validateIntegrantes(rows));
  return upsertIntegrantes(payload);
}

export async function importItensCsv(content: string): Promise<CsvImportResult> {
  const { headers, rows } = parseCsv(content);
  requireHeaders(headers, ['nome', 'valor', 'qtdestoque']);
  const payload = dedupeItens(validateItens(rows).map((item) => ({
    nome: item.nome,
    valor: parseCurrencyInput(item.valor),
    qtdEstoque: Number(item.qtdestoque),
  })));

  if (payload.some((item) => !Number.isInteger(item.qtdEstoque) || item.qtdEstoque < 0)) {
    throw new Error('O campo qtdestoque precisa ser inteiro e maior ou igual a zero para todos os itens.');
  }

  return upsertItens(payload);
}
