export function normalizeMoneyInput(value: string): string | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^(?:0|[1-9][0-9]{0,15})(?:[.][0-9]{1,2})?$/.test(normalized)) return null;
  const [whole = '0', fraction = ''] = normalized.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

export function compareMoneyToZero(value: string): -1 | 0 | 1 {
  const trimmed = value.trim();
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const canonical = normalizeMoneyInput(unsigned);
  if (!canonical || canonical === '0.00') return 0;
  return negative ? -1 : 1;
}

export function absoluteMoney(value: string): string { return value.startsWith('-') ? value.slice(1) : value; }

export function formatMoney(value: string): string {
  const sign = compareMoneyToZero(value) < 0 ? '-' : '';
  const canonical = normalizeMoneyInput(absoluteMoney(value)) ?? '0.00';
  const [whole = '0', fraction = '00'] = canonical.split('.');
  return `${sign}${BigInt(whole).toLocaleString('tr-TR')},${fraction} TL`;
}

export function formatBalance(value: string): string {
  const comparison = compareMoneyToZero(value);
  if (comparison === 0) return 'Hesap kapalı';
  return comparison > 0 ? `${formatMoney(value)} alınacak` : `${formatMoney(absoluteMoney(value))} müşteri alacağı`;
}
