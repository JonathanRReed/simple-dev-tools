/**
 * Shared Base64 / Base64URL / byte helpers. Consolidates the independent
 * implementations that lived in the encoders tool and the security studio.
 *
 * Text conversions use a fatal UTF-8 decoder so invalid byte sequences throw
 * instead of silently producing U+FFFD replacement characters (mojibake).
 */

export const te = new TextEncoder();
export const tdFatal = new TextDecoder("utf-8", { fatal: true });

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function toBase64(text: string): string {
  return bytesToBase64(te.encode(text));
}

/** Fatal: throws on invalid UTF-8 rather than emitting replacement chars. */
export function fromBase64(b64: string): string {
  return tdFatal.decode(base64ToBytes(b64));
}

export function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64Url(b64url: string): string {
  let s = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "====".slice(pad);
  return s;
}

export function bytesToBase64url(bytes: Uint8Array): string {
  return toBase64Url(bytesToBase64(bytes));
}

export function base64urlToBytes(b64url: string): Uint8Array {
  return base64ToBytes(fromBase64Url(b64url));
}

/** Fatal: throws on invalid UTF-8 rather than emitting replacement chars. */
export function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

export function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
