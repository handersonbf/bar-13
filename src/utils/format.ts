const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR').format(parsed);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function formatOrderItemsForDisplay(
  items: {
    nomeItemSnapshot: string;
    quantidade: number;
    subtotal: number;
  }[]
) {
  return items
    .map((item) => `- ${item.quantidade}x ${item.nomeItemSnapshot} — ${formatCurrency(item.subtotal)}`)
    .join('\n');
}
