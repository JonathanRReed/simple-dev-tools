import { isCollection, isPair, isScalar, parseDocument, type Document } from 'yaml';

type JsonParseContext = { source?: string };
type JsonReviver = (this: unknown, key: string, value: unknown, context?: JsonParseContext) => unknown;
type JsonWithRaw = typeof JSON & {
  rawJSON?: (text: string) => unknown;
  parse(text: string, reviver?: JsonReviver): unknown;
};
const JSONX = JSON as JsonWithRaw;


/** A JSON number literal that a JavaScript number cannot hold exactly. */
export class ExactNumber {
  constructor(readonly literal: string) {}
  toString() { return this.literal; }
  toJSON() { return JSONX.rawJSON!(this.literal); }
}

const JSON_NUMBER = /^(-)?(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

function decimalKey(literal: string): string | null {
  const m = JSON_NUMBER.exec(literal);
  if (!m) return null;
  const fraction = m[3] ?? '';
  const all = (m[2] + fraction).replace(/^0+/, '');
  if (!all) return '0';
  const digits = all.replace(/0+$/, '');
  const exponent = BigInt(m[4] ?? 0) - BigInt(fraction.length) + BigInt(all.length - digits.length);
  return `${m[1] ?? ''}${digits}e${exponent}`;
}

/** True when Number(literal) denotes the same decimal value (shortest round trip). */
export function isRepresentable(literal: string): boolean {
  const n = Number(literal);
  return Number.isFinite(n) && decimalKey(literal) === decimalKey(String(n));
}

/** True when Number(literal) is exactly the literal's value, even if JS prints it differently (2^63). */
export function holdsExactly(literal: string): boolean {
  if (isRepresentable(literal)) return true;
  const m = JSON_NUMBER.exec(literal);
  if (!m || m[3] || m[4]) return false;
  const n = Number(literal);
  return Number.isFinite(n) && BigInt(n) === BigInt(literal);
}

export const supportsExactJson = typeof JSONX.rawJSON === 'function';

/** Semantic parse: representable numbers stay Numbers, the rest become ExactNumber. */
export function parseJsonExact(text: string): unknown {
  return JSONX.parse(text, (_key: string, value: unknown, context?: JsonParseContext) =>
    typeof value === 'number' && context?.source !== undefined && !isRepresentable(context.source) ? new ExactNumber(context.source) : value);
}

/** Literal-preserving JSON reformat: every number keeps its source text. */
export function formatJsonExact(text: string, indent = 2): string {
  const value = JSONX.parse(text, (_key: string, v: unknown, context?: JsonParseContext) => (typeof v === 'number' ? JSONX.rawJSON!(context!.source!) : v));
  return JSON.stringify(value, null, indent);
}

/** Number tokens in JSON text that a JavaScript number cannot hold exactly (fallback detector). */
export function findInexactJsonNumbers(text: string): string[] {
  const found: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === '\\') i++; continue; }
    if (c === '-' || (c >= '0' && c <= '9')) {
      const m = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y; m.lastIndex = i;
      const token = m.exec(text)?.[0];
      if (token) { if (!isRepresentable(token)) found.push(token); i += token.length - 1; }
    }
  }
  return found;
}

class Literal {
  constructor(readonly yaml: string, readonly json: string | null) {}
  toString() { return this.json ?? this.yaml; }
}
const literalTag = { identify: (v: unknown) => v instanceof Literal, tag: 'tag:yaml.org,2002:float', default: true, test: /^\b$/, resolve: (s: string) => s, stringify: ({ value }: { value: unknown }) => (value as Literal).yaml };

/** JSON spelling of a YAML numeric scalar, or null when JSON has none (.inf, .nan). */
function yamlNumberToJson(source: string, value: number | bigint): string | null {
  if (JSON_NUMBER.test(source)) return source;
  if (typeof value === 'bigint') return String(value);
  if (!Number.isFinite(value)) return null;
  const m = /^([-+])?(\d*)(?:\.(\d*))?(?:[eE]([-+]?\d+))?$/.exec(source.replace(/_/g, ''));
  if (!m) return String(value);
  const literal = `${m[1] === '-' ? '-' : ''}${(m[2] || '0').replace(/^0+(?=\d)/, '')}${m[3] ? `.${m[3]}` : ''}${m[4] ? `e${m[4]}` : ''}`;
  return JSON_NUMBER.test(literal) ? literal : String(value);
}

function parseYamlDoc(text: string): Document.Parsed {
  const doc = parseDocument(text, { intAsBigInt: true, customTags: [literalTag as never] });
  if (doc.errors.length > 0) throw doc.errors[0];
  return doc;
}

function forEachNumberScalar(doc: Document.Parsed, fn: (node: { value: unknown; source?: string }) => void) {
  const pending: unknown[] = [doc.contents];
  while (pending.length) {
    const node = pending.pop();
    if (isScalar(node)) { if (typeof node.value === 'number' || typeof node.value === 'bigint') fn(node); }
    else if (isPair(node)) pending.push(node.key, node.value);
    else if (isCollection(node)) for (const item of node.items) pending.push(item);
  }
}

/** Literal-preserving YAML reformat: keeps numbers, comments, anchors and aliases. */
export function formatYamlExact(text: string): string {
  const doc = parseYamlDoc(text);
  forEachNumberScalar(doc, (node) => { node.value = new Literal(node.source ?? String(node.value), null); });
  return doc.toString();
}

export class NonJsonNumberError extends Error {}

/** YAML to JSON text with every numeric literal kept (Use source as JSON Schema). */
export function yamlToJsonExact(text: string, indent = 2): string {
  const doc = parseYamlDoc(text);
  const bad: string[] = [];
  forEachNumberScalar(doc, (node) => {
    const source = node.source ?? String(node.value);
    const json = yamlNumberToJson(source, node.value as number | bigint);
    if (json === null) bad.push(source);
    node.value = new Literal(source, json);
  });
  if (bad.length) throw new NonJsonNumberError(`JSON has no representation for ${bad.join(', ')}. Replace it with a finite number before using the source as JSON Schema.`);
  return JSON.stringify(doc.toJS(), (_k, v) => (v instanceof Literal ? JSONX.rawJSON!(v.json!) : v), indent);
}

/** Semantic YAML parse: representable numbers stay Numbers, the rest become ExactNumber. */
export function parseYamlExact(text: string): unknown {
  const doc = parseYamlDoc(text);
  forEachNumberScalar(doc, (node) => {
    const value = node.value as number | bigint;
    const json = yamlNumberToJson(node.source ?? String(value), value);
    if (typeof value === 'bigint') node.value = isRepresentable(json!) ? Number(value) : new ExactNumber(json!);
    else if (json === null) node.value = value;
    else if (!isRepresentable(json)) node.value = new ExactNumber(json);
  });
  return doc.toJS();
}

/** Ajv sees Numbers only. Returns the Number tree plus the rounded values that came from ExactNumber. */
export function toAjvInput(value: unknown): { value: unknown; rounded: number[]; exactPaths: string[] } {
  const rounded: number[] = [];
  const exactPaths: string[] = [];
  const walk = (v: unknown, path: string): unknown => {
    if (v instanceof ExactNumber) {
      const n = Number(v.literal);
      if (!holdsExactly(v.literal)) { rounded.push(n); exactPaths.push(`${path || '/'} = ${v.literal}`); }
      return n;
    }
    if (Array.isArray(v)) return v.map((x, i) => walk(x, `${path}/${i}`));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, `${path}/${k}`)]));
    return v;
  };
  return { value: walk(value, ''), rounded, exactPaths };
}

function numbersIn(v: unknown, out: number[] = []): number[] {
  if (typeof v === 'number') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => numbersIn(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => numbersIn(x, out));
  return out;
}

function hasKey(v: unknown, key: string, pred: (x: unknown) => boolean): boolean {
  if (Array.isArray(v)) return v.some((x) => hasKey(x, key, pred));
  if (v && typeof v === 'object') return Object.entries(v).some(([k, x]) => (k === key && pred(x)) || hasKey(x, key, pred));
  return false;
}

/**
 * Decide whether Ajv's Number-based result is exact. Correctly rounded conversion is
 * monotonic, so a comparison can only flip when the data number and a rounded schema
 * number become equal. Inexact data numbers and inexact multipleOf are not decidable.
 */
export function exactValidationStatus(schema: unknown, data: unknown): { exact: true } | { exact: false; reason: string } {
  const s = toAjvInput(schema);
  const d = toAjvInput(data);
  if (d.exactPaths.length) return { exact: false, reason: `data numbers exceed JavaScript precision: ${d.exactPaths.join(', ')}` };
  if (hasKey(schema, 'multipleOf', (x) => x instanceof ExactNumber)) return { exact: false, reason: 'multipleOf exceeds JavaScript precision' };
  const ties = new Set(s.rounded);
  const tied = numbersIn(d.value).filter((n) => ties.has(n));
  if (tied.length) return { exact: false, reason: `data ${tied.join(', ')} equals a rounded schema value (${s.exactPaths.join(', ')})` };
  return { exact: true };
}
