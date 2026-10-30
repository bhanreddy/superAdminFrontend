export function parseStatement(source: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    value = '',
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(value.trim());
      value = '';
      if (c !== ',') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (c === '\r' && source[i + 1] === '\n') i++;
      }
    } else value += c;
  }
  if (quoted) throw new Error('Unclosed quote in CSV.');
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() || []).map((v) =>
    v.toLowerCase().replace(/^\uFEFF/, ''),
  );
  for (const h of ['date', 'description', 'amount', 'external_key'])
    if (!headers.includes(h)) throw new Error(`CSV requires a ${h} column.`);
  if (!rows.length || rows.length > 1000)
    throw new Error('Import 1–1000 statement rows.');
  return rows.map((values, index) => {
    if (values.length !== headers.length)
      throw new Error(`CSV row ${index + 2} has the wrong number of columns.`);
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}
export function toCsv(rows: Record<string, unknown>[]) {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const quote = (v: unknown) => {
    let s =
      typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '');
    // Signed decimal amounts must stay numeric when opened in a spreadsheet.
    // Other formula prefixes still need neutralizing, including malicious -expressions.
    if (/^[=+@\t\r\n-]/.test(s) && !/^-?\d+(?:\.\d+)?$/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    keys.map(quote).join(','),
    ...rows.map((r) => keys.map((k) => quote(r[k])).join(',')),
  ].join('\r\n');
}
