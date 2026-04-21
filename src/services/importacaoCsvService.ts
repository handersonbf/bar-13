import { CsvImportResult, CsvIntegranteRow, CsvItemRow } from '../types/domain';
import { parseCsv } from '../utils/csv';
import { requireHeaders, parseCurrencyInput } from '../utils/validation';
import { upsertIntegrantes } from '../repositories/integrantesRepository';
import { upsertItens } from '../repositories/itensRepository';

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
    const numeroItem = row.numero_item?.trim();
    const nome = row.nome?.trim();
    const valor = row.valor?.trim();
    const qtdestoque = row.qtdestoque?.trim();

    if (!numeroItem || !nome || !valor || !qtdestoque) {
      throw new Error(`Linha ${index + 2}: numero_item, nome, valor e qtdestoque são obrigatórios.`);
    }

    return {
      numero_item: numeroItem,
      nome,
      valor,
      qtdestoque,
    };
  });
}

function dedupeIntegrantes(rows: CsvIntegranteRow[]) {
  const deduped = new Map<string, CsvIntegranteRow>();

  rows.forEach((row) => {
    deduped.set(row.nome.trim().toLocaleLowerCase('pt-BR'), row);
  });

  return Array.from(deduped.values());
}

function dedupeItens(rows: { numeroItem: number; nome: string; valor: number; qtdEstoque: number }[]) {
  const deduped = new Map<number, { numeroItem: number; nome: string; valor: number; qtdEstoque: number }>();

  rows.forEach((row) => {
    deduped.set(row.numeroItem, row);
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
  requireHeaders(headers, ['numero_item', 'nome', 'valor', 'qtdestoque']);
  const payload = dedupeItens(validateItens(rows).map((item) => ({
    numeroItem: Number(item.numero_item),
    nome: item.nome,
    valor: parseCurrencyInput(item.valor),
    qtdEstoque: Number(item.qtdestoque),
  })));

  if (payload.some((item) => !Number.isInteger(item.numeroItem))) {
    throw new Error('O campo numero_item precisa ser inteiro para todos os itens.');
  }

  if (payload.some((item) => !Number.isInteger(item.qtdEstoque) || item.qtdEstoque < 0)) {
    throw new Error('O campo qtdestoque precisa ser inteiro e maior ou igual a zero para todos os itens.');
  }

  return upsertItens(payload);
}
