/**
 * RFC 4180-ish CSV parsing/serialization, extracted from the JSON Workbench
 * so it can be unit-tested and reused. Handles quoted fields, commas and
 * newlines inside quotes, `""` escaped quotes, and \r\n / \n / \r endings.
 */

/** Parse CSV text into a 2D array of string cells. A trailing newline does not produce a final empty row. */
export function parseCsvGrid(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      // treat \r\n (and a lone \r) as one row terminator
      pushRow();
      if (text[i + 1] === "\n") i += 2;
      else i += 1;
      continue;
    }
    if (c === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  // flush trailing field/row unless the input ended exactly on a terminator
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }
  return rows;
}

/** Coerce a raw CSV string cell to a JS value: numbers, booleans, null, else string. */
export function coerceCsvValue(raw: string): unknown {
  if (raw === "") return "";
  const lower = raw.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  if (lower === "null") return null;
  // Numeric (avoid coercing things like "+", "1.2.3", or leading-zero ids loosely;
  // require a clean JSON-style number).
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return raw;
}

export function parseCsv(text: string): Record<string, unknown>[] {
  const grid = parseCsvGrid(text);
  if (grid.length === 0) return [];
  const header = grid[0];
  if (header.length === 0) return [];
  const out: Record<string, unknown>[] = [];
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    // skip fully blank rows (a single empty cell from a stray blank line)
    if (cells.length === 1 && cells[0] === "") continue;
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < header.length; c++) {
      const key = header[c] || `column_${c + 1}`;
      obj[key] = c < cells.length ? coerceCsvValue(cells[c]) : "";
    }
    out.push(obj);
  }
  return out;
}

export function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Render a JS value as a single CSV cell. Objects/arrays are JSON-stringified. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Convert an array of objects to CSV. Header = union of keys in first-seen
 * order. Throws a friendly error when the value isn't an array of objects.
 */
export function toCsv(value: unknown): string {
  if (!Array.isArray(value)) {
    throw new Error("CSV output needs an array of objects at the top level.");
  }
  if (value.length === 0) return "";
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("CSV output needs every item to be an object (not a primitive or array).");
    }
    for (const k of Object.keys(row as Record<string, unknown>)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  const headerLine = keys.map(escapeCsvCell).join(",");
  const lines = (value as Record<string, unknown>[]).map((row) =>
    keys.map((k) => escapeCsvCell(csvCell(row[k]))).join(",")
  );
  return [headerLine, ...lines].join("\n");
}
