import { compress, decompress } from "fflate";

import {
  bytesToBase64url,
  base64urlToBytes,
  te,
  tdFatal,
} from "@/lib/base64";

/**
 * Shareable-state encoding for tool URLs.
 *
 * Small payloads go straight into URLSearchParams. Large payloads (JSON
 * documents, Mermaid sources, SQL) are gzip-compressed with fflate and
 * base64url-encoded, then placed in the URL hash so we never hit static-host
 * query-length limits or trigger refetches. Format: `#s=1:<payload>`.
 */

const SHARE_VERSION = 1;
/** Payloads above this many chars get compressed. */
const COMPRESS_THRESHOLD = 400;

export type ShareParams = Record<string, string>;

function encodeRaw(params: ShareParams): string {
  const search = new URLSearchParams(params);
  return search.toString();
}

function decodeRaw(raw: string): ShareParams | null {
  try {
    const params: ShareParams = {};
    const search = new URLSearchParams(raw);
    search.forEach((value, key) => {
      params[key] = value;
    });
    return Object.keys(params).length > 0 ? params : null;
  } catch {
    return null;
  }
}

async function encodeCompressed(params: ShareParams): Promise<string> {
  const json = JSON.stringify(params);
  const compressed: Uint8Array = await new Promise((resolve, reject) => {
    compress(te.encode(json), { level: 9 }, (err, data) =>
      err ? reject(err) : resolve(data)
    );
  });
  return `${SHARE_VERSION}:${bytesToBase64url(compressed)}`;
}

async function decodeCompressed(payload: string): Promise<ShareParams | null> {
  const rest = payload.slice(`${SHARE_VERSION}:`.length);
  try {
    const json: Uint8Array = await new Promise((resolve, reject) => {
      decompress(base64urlToBytes(rest), (err, data) =>
        err ? reject(err) : resolve(data)
      );
    });
    const parsed: unknown = JSON.parse(tdFatal.decode(json));
    if (parsed === null || typeof parsed !== "object") return null;
    const params: ShareParams = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") params[key] = value;
    }
    return Object.keys(params).length > 0 ? params : null;
  } catch {
    return null;
  }
}

/** Encode share params into the value for the `s` hash/query component. */
export async function encodeShareState(params: ShareParams): Promise<string> {
  const raw = encodeRaw(params);
  if (raw.length <= COMPRESS_THRESHOLD) return `0:${raw}`;
  try {
    return await encodeCompressed(params);
  } catch {
    // Compression failed (e.g. huge input) — fall back to raw if it fits.
    return `0:${raw}`;
  }
}

/** Decode a value produced by encodeShareState. Returns null when invalid. */
export async function decodeShareState(encoded: string): Promise<ShareParams | null> {
  if (encoded.startsWith("0:")) return decodeRaw(encoded.slice(2));
  if (encoded.startsWith(`${SHARE_VERSION}:`)) return decodeCompressed(encoded);
  return null;
}

/** Read share params from the current location hash (`#s=…`), if any. */
export function readShareParamsFromLocation(): ShareParams | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.startsWith("#s=")) return null;
  // Synchronous path only: version-0 (raw) payloads decode without async.
  const encoded = hash.slice(3);
  if (encoded.startsWith("0:")) return decodeRaw(encoded.slice(2));
  return null;
}

/** Read share params from the current location, awaiting async decode. */
export async function readShareParams(): Promise<ShareParams | null> {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.startsWith("#s=")) return null;
  return decodeShareState(hash.slice(3));
}

/** Build the full shareable URL for the current page with these params. */
export async function buildShareUrl(params: ShareParams): Promise<string> {
  const encoded = await encodeShareState(params);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#s=${encoded}`;
}
