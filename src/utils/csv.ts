function parseRow(line: string) {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"' && insideQuotes) {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function parseCsv(content: string) {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      headers: [] as string[],
      rows: [] as Record<string, string>[],
    };
  }

  const headers = parseRow(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const columns = parseRow(line);
    return headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = columns[index] ?? '';
      return accumulator;
    }, {});
  });

  return {
    headers,
    rows,
  };
}

function escapeCsvValue(value: string | number) {
  const normalized = String(value ?? '');
  if (normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function stringifyCsv(rows: Record<string, string | number>[]) {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(',');
  const dataLines = rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? '')).join(','));
  return [headerLine, ...dataLines].join('\n');
}
