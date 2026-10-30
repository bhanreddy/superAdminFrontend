// Keep paise as decimal digits while formatting. Dividing large integer totals by
// 100 as a floating-point number can change the final paisa in a statement/export.
function parts(value: unknown) {
  const source = String(value || 0);
  if (!/^-?\d+$/.test(source)) return null;
  const digits = source.replace(/^-/, '').replace(/^0+(?=\d)/, '');
  const negative = source.startsWith('-') && /[1-9]/.test(digits);
  return { sign: negative ? '-' : '', whole: digits.slice(0, -2) || '0', fraction: digits.slice(-2).padStart(2, '0') };
}
export function decimal(value: unknown): string {
  const p = parts(value);
  if (!p) throw new Error('Amount must be expressed in integer paise.');
  return `${p.sign}${p.whole}.${p.fraction}`;
}
export function money(value: unknown): string {
  const p = parts(value);
  if (!p) return '—';
  const prefix = p.whole.slice(0, -3), suffix = p.whole.slice(-3);
  const grouped = prefix ? `${prefix.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${suffix}` : suffix;
  return `₹${p.sign}${grouped}.${p.fraction}`;
}
