import { escapeCsvCell } from "./security";

export function normalizeText(input: string): string {
  return input
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function escapeCsv(value: unknown): string {
  const safe = escapeCsvCell(value);
  const escaped = safe.replace(/"/g, '""');

  return `"${escaped}"`;
}

export function csv(rows: unknown[][]): string {
  return rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
}
