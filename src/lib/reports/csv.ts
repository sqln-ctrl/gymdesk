export type CsvValue = Date | number | string | null | undefined;

function stringValue(value: CsvValue): string {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? "" : String(value);
}

export function csvCell(value: CsvValue): string {
  const raw = stringValue(value);
  const safe = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsv(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<CsvValue>>): string {
  return [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n");
}
