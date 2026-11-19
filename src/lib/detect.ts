import { base64ToBytes, fromBase64Url, tdFatal } from "@/lib/base64";
import type { HandoffParams } from "@/lib/handoff";
import { parseMoment } from "@/lib/timestamp";
import { decodeUlidTimestamp } from "@/lib/ulid";

/**
 * Content sniffing for the "paste anything" slot.
 *
 * Given a blob of text, work out what it probably is and which tool should
 * open it. Everything here is a pure, synchronous, local heuristic: nothing is
 * fetched, evaluated, or sent anywhere. A wrong guess costs one extra click, so
 * the rules favour being specific over being clever. An input that is
 * ambiguous simply produces more than one suggestion.
 */

export type Detection = {
  /** Stable id for the kind of content, e.g. "jwt". */
  kind: string;
  /** What the content looks like, e.g. "JSON Web Token". */
  what: string;
  /** A short fact read from the content, e.g. "HS256, expires 2027-01-01". */
  detail?: string;
  /** Tool route that should open it. */
  href: string;
  /** State handed to that tool, in its own share-link vocabulary. */
  params: HandoffParams;
  /** A CSS color to preview, for color detections. */
  swatch?: string;
};

export type DetectionResult = {
  /** Specific guesses, most confident first. */
  matches: Detection[];
  /** Things any text can be used for, offered when nothing specific matched. */
  fallbacks: Detection[];
};

/** Above this many characters only the cheap, prefix-based rules run. */
const DEEP_SCAN_LIMIT = 400_000;
const MAX_MATCHES = 4;

const HEX_DIGESTS: Record<number, string> = {
  32: "MD5",
  40: "SHA-1",
  64: "SHA-256",
  96: "SHA-384",
  128: "SHA-512",
};

const MERMAID_START =
  /^(?:(?:graph|flowchart)\s+(?:TB|TD|BT|RL|LR)\b|sequenceDiagram\b|classDiagram\b|stateDiagram(?:-v2)?\b|erDiagram\b|gantt\b|pie\b|journey\b|gitGraph\b|mindmap\b|timeline\b|quadrantChart\b)/;

const SQL_START =
  /^(?:select\s+(?:[\d*('"]|[\s\S]*?\sfrom\s)|insert\s+into\s|update\s+\S+\s+set\s|delete\s+from\s|create\s+(?:table|index|view|trigger)\s|with\s+\S+\s+as\s*\(|pragma\s|drop\s+(?:table|index|view)\s|alter\s+table\s)/i;

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:\s?(?:Z|[+-]\d{2}:?\d{2}))?)?$/;

const CRON_MACRO = /^@(?:yearly|annually|monthly|weekly|daily|midnight|hourly)$/i;
const CRON_FIELD = /^(?:[\d*?/,\-LW#]+|[A-Za-z]{3}(?:[-,][A-Za-z]{3})*)$/;

function truncate(text: string, max = 56): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function plural(n: number, word: string): string {
  return `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function decodeBase64UrlJson(part: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(tdFatal.decode(base64ToBytes(fromBase64Url(part))));
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Share of characters that are ordinary printable text. */
function printableRatio(text: string): number {
  if (text.length === 0) return 0;
  let printable = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)) printable++;
  }
  return printable / text.length;
}

function detectJwt(value: string): Detection | null {
  if (!/^[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]*$/.test(value)) return null;
  const [headerPart, payloadPart] = value.split(".");
  const header = decodeBase64UrlJson(headerPart);
  if (!header || typeof header.alg !== "string") return null;
  const payload = decodeBase64UrlJson(payloadPart);
  const facts = [header.alg];
  if (payload && typeof payload.exp === "number" && Number.isFinite(payload.exp)) {
    const expires = new Date(payload.exp * 1000);
    if (!Number.isNaN(expires.getTime())) facts.push(`expires ${isoDay(expires)}`);
  }
  return {
    kind: "jwt",
    what: "JSON Web Token",
    detail: facts.join(", "),
    href: "/studio/security/",
    params: { jwt: value },
  };
}

function detectUuid(value: string): Detection | null {
  const match = /^[0-9a-f]{8}-[0-9a-f]{4}-([0-9a-f])[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i.exec(value);
  if (!match) return null;
  const version = Number.parseInt(match[1], 16);
  return {
    kind: "uuid",
    what: "UUID",
    detail: version >= 1 && version <= 8 ? `version ${version}` : undefined,
    href: "/tools/ids-cron/",
    params: { tab: "ids", uuid: value },
  };
}

function detectUlid(value: string): Detection | null {
  if (!/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(value)) return null;
  try {
    const created = new Date(decodeUlidTimestamp(value));
    // A ULID's clock should land somewhere plausible; random base32 rarely does.
    const year = created.getUTCFullYear();
    if (Number.isNaN(created.getTime()) || year < 2010 || year > 2200) return null;
    return {
      kind: "ulid",
      what: "ULID",
      detail: `created ${isoDay(created)}`,
      href: "/tools/ids-cron/",
      params: { tab: "ids", ulid: value },
    };
  } catch {
    return null;
  }
}

function detectTimestamp(value: string): Detection | null {
  const numeric = /^\d{10}(?:\.\d+)?$|^\d{13}$/.test(value);
  if (!numeric && !ISO_DATE.test(value)) return null;
  const parsed = parseMoment(value);
  if (!parsed.ok) return null;
  const what =
    parsed.detected === "seconds"
      ? "Unix time, in seconds"
      : parsed.detected === "milliseconds"
        ? "Unix time, in milliseconds"
        : "Date and time";
  return {
    kind: "timestamp",
    what,
    detail: parsed.date.toISOString().replace(".000Z", "Z"),
    href: "/tools/timestamp/",
    params: { v: value },
  };
}

function detectColor(value: string): Detection | null {
  const hex = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
  const fn = /^(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(\s*[-\d.%,/\sa-z]+\)$/i.test(value);
  if (!hex && !fn) return null;
  return {
    kind: "color",
    what: "Color",
    detail: hex ? "hex" : value.slice(0, value.indexOf("(")).toLowerCase(),
    href: "/tools/color/",
    params: { c: value },
    swatch: value,
  };
}

function detectCron(value: string): Detection | null {
  if (CRON_MACRO.test(value)) {
    return {
      kind: "cron",
      what: "Cron schedule",
      href: "/tools/ids-cron/",
      params: { tab: "cron", cron: value },
    };
  }
  const fields = value.split(/\s+/);
  if (fields.length < 5 || fields.length > 6) return null;
  if (!fields.every((field) => CRON_FIELD.test(field))) return null;
  // Five plain numbers are far more likely to be a list than a schedule.
  if (!fields.some((field) => /[*?/]/.test(field))) return null;
  return {
    kind: "cron",
    what: "Cron schedule",
    detail: `${fields.length} fields`,
    href: "/tools/ids-cron/",
    params: { tab: "cron", cron: value },
  };
}

function detectDigest(value: string): Detection | null {
  if (!/^[0-9a-f]+$/i.test(value)) return null;
  const algorithm = HEX_DIGESTS[value.length];
  if (!algorithm) return null;
  return {
    kind: "digest",
    what: `${algorithm} digest`,
    detail: `${value.length} hex characters`,
    href: "/tools/hash/",
    params: { expected: value },
  };
}

function detectRegexLiteral(value: string): Detection | null {
  const match = /^\/(.+)\/([dgimsuvy]*)$/.exec(value);
  if (!match || value.includes("\n")) return null;
  // A path such as /usr/local/ parses as a literal too; require regex syntax.
  if (!/[\\^$*+?()[\]{}|]/.test(match[1])) return null;
  try {
    RegExp(match[1], match[2]);
  } catch {
    return null;
  }
  return {
    kind: "regex",
    what: "Regular expression",
    detail: match[2] ? `flags ${match[2]}` : undefined,
    href: "/tools/regex/",
    params: { p: match[1], f: match[2] },
  };
}

function detectUrl(value: string): Detection[] {
  if (/\s/.test(value) || !/^https?:\/\//i.test(value)) return [];
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return [];
  }
  const out: Detection[] = [];
  const pairs = [...url.searchParams.keys()].length;
  if (pairs > 0) {
    out.push({
      kind: "url-query",
      what: "URL with a query string",
      detail: plural(pairs, "parameter"),
      href: "/tools/query/",
      params: { q: value },
    });
  }
  out.push({
    kind: "url",
    what: "URL",
    detail: url.host,
    href: "/api-snippet/",
    params: { url: value, method: "GET" },
  });
  if (value.length <= 600) {
    out.push({
      kind: "url-qr",
      what: "URL, as a QR code",
      detail: url.host,
      href: "/tools/encode-qr/",
      params: { tab: "qr", q: value },
    });
  }
  return out;
}

function detectQueryString(value: string): Detection | null {
  if (/\s/.test(value)) return null;
  const body = value.startsWith("?") ? value.slice(1) : value;
  const pairs = body.split("&");
  const minimum = value.startsWith("?") ? 1 : 2;
  if (pairs.length < minimum) return null;
  if (!pairs.every((pair) => /^[^=&]+=[^&]*$/.test(pair))) return null;
  return {
    kind: "query",
    what: "Query string",
    detail: plural(pairs.length, "parameter"),
    href: "/tools/query/",
    params: { q: value },
  };
}

function detectPercentEncoded(value: string): Detection | null {
  if (/\s/.test(value)) return null;
  const escapes = value.match(/%[0-9a-f]{2}/gi);
  if (!escapes || escapes.length < 2) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  return {
    kind: "percent",
    what: "URL-encoded text",
    detail: truncate(decoded),
    href: "/tools/encode-qr/",
    params: { tab: "url", u: value, um: "decode" },
  };
}

function detectBase64(value: string): Detection | null {
  const compact = value.replace(/\s+/g, "");
  if (compact.length < 16) return null;
  const standard = /^[A-Za-z0-9+/]+={0,2}$/.test(compact) && compact.length % 4 === 0;
  const urlSafe = !standard && /^[A-Za-z0-9_-]+$/.test(compact) && /[-_]/.test(compact);
  if (!standard && !urlSafe) return null;
  let decoded: string;
  try {
    decoded = tdFatal.decode(base64ToBytes(urlSafe ? fromBase64Url(compact) : compact));
  } catch {
    return null;
  }
  // Ordinary words are valid Base64 too, but they decode to noise.
  if (decoded.length === 0 || printableRatio(decoded) < 0.95) return null;
  return {
    kind: "base64",
    what: urlSafe ? "Base64URL text" : "Base64 text",
    detail: truncate(decoded),
    href: "/tools/encode-qr/",
    params: { tab: "base64", b: compact, bm: "decode", bu: urlSafe ? "1" : "0" },
  };
}

function describeJson(parsed: unknown): string {
  if (Array.isArray(parsed)) return `array, ${plural(parsed.length, "item")}`;
  if (parsed !== null && typeof parsed === "object") {
    return `object, ${plural(Object.keys(parsed).length, "key")}`;
  }
  return typeof parsed;
}

function looksLikeSchema(parsed: unknown): "openapi" | "schema" | null {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const doc = parsed as Record<string, unknown>;
  if (typeof doc.openapi === "string" || typeof doc.swagger === "string") return "openapi";
  if (typeof doc.$schema === "string") return "schema";
  if (doc.type === "object" && doc.properties !== null && typeof doc.properties === "object") {
    return "schema";
  }
  return null;
}

function detectJson(value: string, deep: boolean): Detection[] {
  const first = value[0];
  const last = value[value.length - 1];
  const bracketed = (first === "{" && last === "}") || (first === "[" && last === "]");
  if (!bracketed) return [];
  if (!deep) {
    return [{ kind: "json", what: "JSON", href: "/tools/json/", params: { src: value, sf: "json" } }];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Still the right tool: the workbench reports where the error is.
    return [
      {
        kind: "json-invalid",
        what: "JSON, with a syntax error",
        detail: "open it to see where",
        href: "/tools/json/",
        params: { src: value, sf: "json" },
      },
    ];
  }
  const json: Detection = {
    kind: "json",
    what: "JSON",
    detail: describeJson(parsed),
    href: "/tools/json/",
    params: { src: value, sf: "json" },
  };
  const schema = looksLikeSchema(parsed);
  if (!schema) return [json];
  return [
    {
      kind: schema,
      what: schema === "openapi" ? "OpenAPI document" : "JSON Schema",
      detail: describeJson(parsed),
      href: "/studio/schema/",
      params: { src: value, fmt: "json" },
    },
    json,
  ];
}

function detectYaml(value: string, lines: string[]): Detection[] {
  if (lines.length < 2) return [];
  const meaningful = lines.filter((line) => line.trim() !== "" && !line.trim().startsWith("#"));
  if (meaningful.length < 2) return [];
  const keyed = meaningful.filter((line) => /^\s*(?:- )?[\w."'$-]+:(?:\s|$)/.test(line)).length;
  const listed = meaningful.filter((line) => /^\s*- \S/.test(line)).length;
  if ((keyed + listed) / meaningful.length < 0.8 || keyed === 0) return [];
  const yaml: Detection = {
    kind: "yaml",
    what: "YAML",
    detail: plural(meaningful.length, "line"),
    href: "/tools/json/",
    params: { src: value, sf: "yaml", tf: "json" },
  };
  if (/^(?:openapi|swagger):\s*\S/m.test(value)) {
    return [
      {
        kind: "openapi",
        what: "OpenAPI document",
        detail: "YAML",
        href: "/studio/schema/",
        params: { src: value, fmt: "yaml" },
      },
      yaml,
    ];
  }
  return [yaml];
}

function countUnquotedCommas(line: string): number {
  let commas = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) commas++;
  }
  return commas;
}

function detectCsv(value: string, lines: string[]): Detection | null {
  const rows = lines.filter((line) => line.trim() !== "");
  if (rows.length < 2) return null;
  const columns = countUnquotedCommas(rows[0]);
  if (columns < 1) return null;
  const sample = rows.slice(0, 6);
  if (!sample.every((row) => countUnquotedCommas(row) === columns)) return null;
  return {
    kind: "csv",
    what: "CSV",
    detail: `${plural(columns + 1, "column")}, ${plural(rows.length - 1, "row")}`,
    href: "/tools/json/",
    params: { src: value, sf: "csv", tf: "json" },
  };
}

function detectMarkdown(value: string, lines: string[]): Detection | null {
  let signals = 0;
  if (/^#{1,6} \S/m.test(value)) signals += 2;
  if (/^```/m.test(value)) signals += 2;
  if (/\[[^\]\n]+\]\([^)\s]+\)/.test(value)) signals++;
  if (/^\s*(?:[-*+]|\d+\.) \S/m.test(value)) signals++;
  if (/(?:\*\*|__)\S[^*_\n]*(?:\*\*|__)/.test(value)) signals++;
  if (/^> \S/m.test(value)) signals++;
  if (signals < 2) return null;
  return {
    kind: "markdown",
    what: "Markdown",
    detail: plural(lines.length, "line"),
    href: "/tools/markdown/",
    params: { md: value },
  };
}

function buildFallbacks(value: string, lines: string[]): Detection[] {
  const size = plural(value.length, "character");
  const out: Detection[] = [
    {
      kind: "text-hash",
      what: "Text, to hash",
      detail: size,
      href: "/tools/hash/",
      params: { text: value },
    },
    {
      kind: "text-base64",
      what: "Text, to encode as Base64",
      detail: size,
      href: "/tools/encode-qr/",
      params: { tab: "base64", b: value, bm: "encode" },
    },
  ];
  if (lines.length > 1) {
    out.unshift({
      kind: "text-diff",
      what: "Text, to compare",
      detail: plural(lines.length, "line"),
      href: "/tools/diff/",
      params: { a: value },
    });
  } else if (value.length <= 600) {
    out.push({
      kind: "text-qr",
      what: "Text, as a QR code",
      detail: size,
      href: "/tools/encode-qr/",
      params: { tab: "qr", q: value },
    });
  }
  return out.slice(0, 3);
}

/** Work out what `input` looks like and which tools can open it. */
export function detect(input: string): DetectionResult {
  const value = input.trim();
  if (value === "") return { matches: [], fallbacks: [] };

  const deep = value.length <= DEEP_SCAN_LIMIT;
  const singleLine = !value.includes("\n");
  const lines = deep ? value.split(/\r?\n/) : [];
  const matches: Detection[] = [];
  const add = (found: Detection | Detection[] | null) => {
    if (!found) return;
    for (const item of Array.isArray(found) ? found : [found]) matches.push(item);
  };

  if (singleLine && value.length <= 8192) {
    add(detectJwt(value));
    add(detectUuid(value));
    add(detectUlid(value));
    add(detectTimestamp(value));
    add(detectColor(value));
    add(detectDigest(value));
    add(detectCron(value));
    add(detectRegexLiteral(value));
    add(detectUrl(value));
    if (matches.length === 0) add(detectQueryString(value));
    if (matches.length === 0) add(detectPercentEncoded(value));
  }

  if (matches.length === 0) add(detectJson(value, deep));

  if (matches.length === 0) {
    const firstLine = value.slice(0, 200).split(/\r?\n/, 1)[0].trim();
    if (MERMAID_START.test(firstLine)) {
      add({
        kind: "mermaid",
        what: "Mermaid diagram",
        detail: firstLine.split(/\s+/, 1)[0],
        href: "/mermaid/",
        params: { code: value },
      });
    } else if (SQL_START.test(value)) {
      add({
        kind: "sql",
        what: "SQL",
        detail: `${value.split(/\s+/, 1)[0].toUpperCase()} statement`,
        href: "/sqlite/",
        params: { sql: value },
      });
    }
  }

  if (matches.length === 0 && deep) {
    if (value.length <= 200_000) add(detectBase64(value));
    if (matches.length === 0) add(detectYaml(value, lines));
    if (matches.length === 0) add(detectCsv(value, lines));
    if (matches.length === 0) add(detectMarkdown(value, lines));
  }

  return {
    matches: matches.slice(0, MAX_MATCHES),
    fallbacks: matches.length === 0 && deep ? buildFallbacks(value, lines) : [],
  };
}
