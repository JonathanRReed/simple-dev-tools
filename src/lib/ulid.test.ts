import { expect, test, describe } from "bun:test";
import { decodeUlidTimestamp, MAX_ULID_TIMESTAMP } from "./ulid";

describe("decodeUlidTimestamp", () => {
  test("decodes valid uppercase ULID timestamp", () => {
    // 01ARZ3NDEK -> timestamp 1469922850259 ms (2016-07-30T23:54:10.259Z)
    const ulid = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
    expect(decodeUlidTimestamp(ulid)).toBe(1469922850259);
  });

  test("decodes valid lowercase ULID timestamp", () => {
    const ulid = "01arz3ndektsv4rrffq69g5fav";
    expect(decodeUlidTimestamp(ulid)).toBe(1469922850259);
  });

  test("handles leading and trailing whitespace trimming", () => {
    const ulid = "   01ARZ3NDEKTSV4RRFFQ69G5FAV\n\t  ";
    expect(decodeUlidTimestamp(ulid)).toBe(1469922850259);
  });

  test("throws error when length after trimming is not 26 characters", () => {
    expect(() => decodeUlidTimestamp("01ARZ3NDEK")).toThrow(
      "A ULID must be exactly 26 characters."
    );
    expect(() => decodeUlidTimestamp("01ARZ3NDEKTSV4RRFFQ69G5FAV0")).toThrow(
      "A ULID must be exactly 26 characters."
    );
  });

  test("throws error when invalid Crockford Base32 characters occur in timestamp part", () => {
    // 'I' and 'U' are invalid Crockford base32 characters in standard ULIDs
    expect(() => decodeUlidTimestamp("01ARZ3NDEITSV4RRFFQ69G5FAV")).toThrow(
      "ULID contains characters outside Crockford base32."
    );
  });

  test("throws error when invalid characters occur in the random suffix", () => {
    // Invalid character 'U' in position 20 of a 26-char string
    expect(() => decodeUlidTimestamp("01ARZ3NDEKTSV4RRFFQU69G5FA")).toThrow(
      "ULID contains characters outside Crockford base32."
    );
    // Invalid character '!' in the random suffix
    expect(() => decodeUlidTimestamp("01ARZ3NDEKTSV4RRFFQ69G5FA!")).toThrow(
      "ULID contains characters outside Crockford base32."
    );
  });

  test("throws error on non-ASCII input", () => {
    // Non-ASCII CJK character '漢' at position 25 of a 26-char string
    expect(() => decodeUlidTimestamp("01ARZ3NDEKTSV4RRFFQ69G5FA漢")).toThrow(
      "ULID contains characters outside Crockford base32."
    );
  });

  test("handles maximum allowed 48-bit timestamp boundary", () => {
    // 7ZZZZZZZZZ = 281474976710655 ms (MAX_ULID_TIMESTAMP)
    const maxUlid = "7ZZZZZZZZZZZZZZZZZZZZZZZZZ";
    expect(decodeUlidTimestamp(maxUlid)).toBe(MAX_ULID_TIMESTAMP);
  });

  test("throws error when timestamp overflows 48 bits", () => {
    // 8000000000 = 281474976710656 ms (MAX_ULID_TIMESTAMP + 1)
    const overflowUlid = "8000000000ZZZZZZZZZZZZZZZZ";
    expect(() => decodeUlidTimestamp(overflowUlid)).toThrow(
      "ULID timestamp overflows 48 bits."
    );
  });
});
