import { compressSync, decompressSync } from "fflate";

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
 *
 * All APIs are synchronous: compression is bounded by MAX_SHARE_INPUT_LENGTH
 * and decompression by MAX_DECOMPRESSED_LENGTH, so hydration can happen in a
 * layout effect with no async race against user input.
 */

const SHARE_VERSION = 1;
/** Payloads above this many chars get compressed. */
const COMPRESS_THRESHOLD = 400;
/** Hard cap on the encoded `#s=` payload (chars). ~32k stays within
 * Firefox/Safari practical URL limits and bounds compression time. */
const MAX_SHARE_ENCODED_LENGTH = 32_000;
/** Hard cap on the decompressed JSON accepted when reading a share. */
const MAX_DECOMPRESSED_LENGTH = 2_000_000;

export type ShareParams = Record<string, string>;

/** Thrown by buildShareUrl/encodeShareState when the state is too large to share. */
export class ShareUrlTooLargeError extends Error {
  readonly encodedLength: number;
  constructor(encodedLength: number) {
    super(
      `Share link is too large (${encodedLength.toLocaleString()} characters). Copy the content instead — most tools can download it as a file.`
    );
    this.name = "ShareUrlTooLargeError";
    this.encodedLength = encodedLength;
  }
}

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

function encodeCompressed(params: ShareParams): string {
  const json = JSON.stringify(params);
  const compressed = compressSync(te.encode(json), { level: 6 });
  return `${SHARE_VERSION}:${bytesToBase64url(compressed)}`;
}

function decodeCompressed(payload: string): ShareParams | null {
  const rest = payload.slice(`${SHARE_VERSION}:`.length);
  try {
    const bytes = base64urlToBytes(rest);
    if (bytes.length > MAX_DECOMPRESSED_LENGTH) return null;
    const json = tdFatal.decode(decompressSync(bytes));
    if (json.length > MAX_DECOMPRESSED_LENGTH) return null;
    const parsed: unknown = JSON.parse(json);
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
export function encodeShareState(params: ShareParams): string {
  const raw = encodeRaw(params);
  if (raw.length <= COMPRESS_THRESHOLD) return `0:${raw}`;
  try {
    return encodeCompressed(params);
  } catch {
    // Compression failed (e.g. huge input) — fall back to raw if it fits.
    return `0:${raw}`;
  }
}

/** Decode a value produced by encodeShareState. Returns null when invalid. */
export function decodeShareState(encoded: string): ShareParams | null {
  if (encoded.startsWith("0:")) return decodeRaw(encoded.slice(2));
  if (encoded.startsWith(`${SHARE_VERSION}:`)) return decodeCompressed(encoded);
  return null;
}

/** Read share params from the current location hash (`#s=…`), if any. Synchronous. */
export function readShareParams(): ShareParams | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.startsWith("#s=")) return null;
  return decodeShareState(hash.slice(3));
}

/** Build the full shareable URL for the current page with these params. */
export function buildShareUrl(params: ShareParams): string {
  const encoded = encodeShareState(params);
  const total = encoded.length + 3; // "#s="
  if (total > MAX_SHARE_ENCODED_LENGTH) {
    throw new ShareUrlTooLargeError(total);
  }
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#s=${encoded}`;
}
