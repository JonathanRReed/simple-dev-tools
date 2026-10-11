// Crockford's Base32 used by ULID (no I, L, O, U)
export const CROCK32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// Performance optimization: Precomputed 128-element lookup array for ASCII Crockford base32 chars.
// Maps both uppercase and lowercase char codes directly to their 0..31 base32 values,
// avoiding regex evaluation, .slice()/.toUpperCase() string allocations, and object property lookups.
const CROCK32_DECODE_TABLE = new Int8Array(128).fill(-1);
for (let i = 0; i < CROCK32.length; i++) {
  const char = CROCK32[i];
  CROCK32_DECODE_TABLE[char.charCodeAt(0)] = i;
  CROCK32_DECODE_TABLE[char.toLowerCase().charCodeAt(0)] = i;
}

// Maximum value representable by a ULID's 48-bit timestamp.
export const MAX_ULID_TIMESTAMP = 0xffffffffffff; // 281474976710655

/**
 * Decode the 48-bit timestamp embedded in a ULID. Validates length, character
 * set (Crockford base32, case-insensitive) and that the decoded timestamp does
 * not overflow 48 bits — instead of silently reporting a wrong result.
 * Performance: uses single-pass CROCK32_DECODE_TABLE charCode indexing to avoid
 * string allocations and regex evaluations during decoding.
 */
export function decodeUlidTimestamp(u: string): number {
  const value = u.trim();
  if (value.length !== 26) {
    throw new Error("A ULID must be exactly 26 characters.");
  }
  let ms = 0;
  for (let i = 0; i < 26; i++) {
    const code = value.charCodeAt(i);
    const v = code < 128 ? CROCK32_DECODE_TABLE[code] : -1;
    if (v === -1) {
      throw new Error("ULID contains characters outside Crockford base32.");
    }
    if (i < 10) {
      ms = ms * 32 + v;
    }
  }
  if (ms > MAX_ULID_TIMESTAMP) {
    throw new Error("ULID timestamp overflows 48 bits.");
  }
  return ms; // milliseconds since epoch
}
