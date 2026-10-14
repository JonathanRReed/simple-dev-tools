/**
 * RFC 4180-ish CSV parsing/serialization, extracted from the JSON Workbench
 * so it can be unit-tested and reused. Handles quoted fields, commas and
 * newlines inside quotes, `""` escaped quotes, and \r\n / \n / \r endings.
 */

/**
 * Parse CSV text into a 2D array of string cells. A trailing newline does not produce a final empty row.
 * Performance: uses slice ranges for contiguous character runs instead of char-by-char string concatenation.
 */
export function parseCsvGrid(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let hasEscapedQuotes = false;
  let inQuotes = false;
  let fieldStart = 0;
  let i = 0;
  const n = text.length;

  const pushField = () => {
    if (!hasEscapedQuotes && field === "") {
      row.push(text.slice(fieldStart, i));
    } else {
      if (fieldStart < i) {
        field += text.slice(fieldStart, i);
      }
      row.push(field);
      field = "";
      hasEscapedQuotes = false;
    }
  };

  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const code = text.charCodeAt(i);

    if (inQuotes) {
      if (code === 34 /* " */) {
        if (i + 1 < n && text.charCodeAt(i + 1) === 34) {
          field += text.slice(fieldStart, i) + '"';
          hasEscapedQuotes = true;
          i += 2;
          fieldStart = i;
          continue;
        }
        field += text.slice(fieldStart, i);
        inQuotes = false;
        i += 1;
        fieldStart = i;
        continue;
      }
      i += 1;
      continue;
    }

    if (code === 34 /* " */) {
      field += text.slice(fieldStart, i);
      inQuotes = true;
      i += 1;
      fieldStart = i;
      continue;
    }
    if (code === 44 /* , */) {
      pushField();
      i += 1;
      fieldStart = i;
      continue;
    }
    if (code === 13 /* \r */) {
      // treat \r\n (and a lone \r) as one row terminator
      pushRow();
      if (i + 1 < n && text.charCodeAt(i + 1) === 10) i += 2;
      else i += 1;
      fieldStart = i;
      continue;
    }
    if (code === 10 /* \n */) {
      pushRow();
      i += 1;
      fieldStart = i;
      continue;
    }
    i += 1;
  }

  // flush trailing field/row unless the input ended exactly on a terminator
  if (fieldStart < n || field.length > 0 || row.length > 0 || hasEscapedQuotes) {
    pushRow();
  }
  return rows;
}

const NUMERIC_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const ESCAPE_RE = /[",\r\n]/;
const QUOTE_RE = /"/g;

/** Coerce a raw CSV string cell to a JS value: numbers, booleans, null, else string. */
export function coerceCsvValue(raw: string): unknown {
  if (raw === "") return "";
  const len = raw.length;
  if (len === 4 || len === 5) {
    const lower = raw.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
    if (lower === "null") return null;
  }

  // Fast first-character check before regex: JSON numbers start with '0'..'9' or '-'
  const code = raw.charCodeAt(0);
  if ((code >= 48 && code <= 57) || code === 45) {
    if (NUMERIC_RE.test(raw)) {
      const num = Number(raw);
      if (Number.isFinite(num)) return num;
    }
  }
  return raw;
}

export function parseCsv(text: string): Record<string, unknown>[] {
  const grid = parseCsvGrid(text);
  if (grid.length === 0) return [];
  const header = grid[0];
  if (header.length === 0) return [];

  // Performance optimization: Pre-derive fallback header keys once rather than
  // re-evaluating `header[c] || column_${c + 1}` inside nested row/cell loops.
  const numCols = header.length;
  const keys: string[] = [];
  for (let c = 0; c < numCols; c++) {
    keys.push(header[c] || `column_${c + 1}`);
  }

  const out: Record<string, unknown>[] = [];
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    // skip fully blank rows (a single empty cell from a stray blank line)
    if (cells.length === 1 && cells[0] === "") continue;
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < numCols; c++) {
      obj[keys[c]] = c < cells.length ? coerceCsvValue(cells[c]) : "";
    }
    out.push(obj);
  }
  return out;
}

function escapeCsvCell(value: string): string {
  if (ESCAPE_RE.test(value)) {
    return `"${value.replace(QUOTE_RE, '""')}"`;
  }
  return value;
}

/** Render a JS value as a single CSV cell. Objects/arrays are JSON-stringified. */
function csvCell(value: unknown): string {
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
 * Performance: pre-formats rows using index loops to avoid nested .map()
 * allocations and array spread copying.
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
  const numKeys = keys.length;
  const lines: string[] = [keys.map(escapeCsvCell).join(",")];

  for (let i = 0; i < value.length; i++) {
    const row = value[i] as Record<string, unknown>;
    let line = escapeCsvCell(csvCell(row[keys[0]]));
    for (let j = 1; j < numKeys; j++) {
      line += "," + escapeCsvCell(csvCell(row[keys[j]]));
    }
    lines.push(line);
  }
  return lines.join("\n");
}
