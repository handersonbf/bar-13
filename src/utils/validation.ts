export function requireHeaders(headers: string[], expected: string[]) {
  const missing = expected.filter((header) => !headers.includes(header));

  if (missing.length > 0) {
    throw new Error(`Cabeçalhos ausentes: ${missing.join(', ')}`);
  }
}

export function parseCurrencyInput(value: string) {
  const trimmed = value.trim();
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');

  let normalized = trimmed;

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      normalized = trimmed.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = trimmed.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    normalized = trimmed.replace(',', '.');
  } else if (lastDot >= 0) {
    const decimalDigits = trimmed.length - lastDot - 1;
    normalized = decimalDigits === 2 ? trimmed : trimmed.replace(/\./g, '');
  }

  const numericValue = Number(normalized);

  if (!Number.isFinite(numericValue)) {
    throw new Error(`Valor inválido: ${value}`);
  }

  return numericValue;
}
