import { describe, expect, test } from 'bun:test';

import { encodeShareState, decodeShareState } from './share';

describe('encodeShareState / decodeShareState', () => {
  test('round-trips small params with version-0 raw prefix', async () => {
    const params = { foo: 'bar', baz: 'qux' };
    const encoded = await encodeShareState(params);
    expect(encoded.startsWith('0:')).toBe(true);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(params);
  });

  test('preserves URLSearchParams semantics', async () => {
    const params = { q: 'hello world', special: 'a&b=c' };
    const encoded = await encodeShareState(params);
    expect(encoded.startsWith('0:')).toBe(true);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(params);
  });

  test('compresses large params with version-1 prefix and round-trips', async () => {
    const params = { data: 'x'.repeat(500) };
    const encoded = await encodeShareState(params);
    expect(encoded.startsWith('1:')).toBe(true);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(params);
  });

  test('round-trips unicode values', async () => {
    const params = { text: 'hello 中文 🎉' };
    const encoded = await encodeShareState(params);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(params);
  });

  test('round-trips empty-string values', async () => {
    const params = { empty: '', other: 'value' };
    const encoded = await encodeShareState(params);
    const decoded = await decodeShareState(encoded);
    expect(decoded).toEqual(params);
  });

  test('returns null for garbage input', async () => {
    expect(await decodeShareState('garbage')).toBeNull();
    expect(await decodeShareState('')).toBeNull();
    expect(await decodeShareState('0:')).toBeNull();
  });

  test('returns null for wrong version prefixes', async () => {
    expect(await decodeShareState('2:abc')).toBeNull();
    expect(await decodeShareState('9:abc')).toBeNull();
  });

  test('returns null for truncated or invalid compressed data', async () => {
    expect(await decodeShareState('1:')).toBeNull();
    expect(await decodeShareState('1:ab')).toBeNull();
    expect(await decodeShareState('1:!!')).toBeNull();
    expect(await decodeShareState('1:bm90LWdvb2Q')).toBeNull();
  });
});

describe("handoff between pages", () => {
  // The handoff uses sessionStorage and location, which bun's test runtime
  // does not provide, so a minimal window is installed for these cases.
  function withWindow(pathname: string, run: () => void) {
    const store = new Map<string, string>();
    const original = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {
      location: { pathname, hash: "" },
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    };
    try {
      run();
    } finally {
      (globalThis as { window?: unknown }).window = original;
    }
    return store;
  }

  test("content reaches the addressed tool without touching the URL", async () => {
    const { handoffUrl } = await import("./handoff");
    const { readShareParams } = await import("./share");
    const store = withWindow("/tools/json/", () => {
      expect(handoffUrl("/tools/json/", { src: '{"a":1}', sf: "json" })).toBe("/tools/json/");
      expect(readShareParams()).toEqual({ src: '{"a":1}', sf: "json" });
    });
    // Consumed on first read: nothing is left behind in storage.
    expect(store.size).toBe(0);
  });

  test("a handoff addressed to another route is discarded, not delivered", async () => {
    const { stashHandoff, readHandoff } = await import("./handoff");
    const store = withWindow("/tools/regex/", () => {
      stashHandoff("/tools/hash/", { text: "secret" });
      expect(readHandoff()).toBeNull();
    });
    expect(store.size).toBe(0);
  });

  test("a share link in the hash wins over a pending handoff", async () => {
    const { stashHandoff } = await import("./handoff");
    const { encodeShareState, readShareParams } = await import("./share");
    withWindow("/tools/json/", () => {
      stashHandoff("/tools/json/", { src: "from handoff" });
      (window as unknown as { location: { hash: string } }).location.hash =
        `#s=${encodeShareState({ src: "from link" })}`;
      expect(readShareParams()).toEqual({ src: "from link" });
    });
  });
});

test("without sessionStorage a small handoff degrades to a plain share link", async () => {
  const { handoffUrl } = await import("./handoff");
  const { decodeShareState } = await import("./share");
  const original = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {
    location: { pathname: "/", hash: "" },
    get sessionStorage(): never {
      throw new Error("blocked");
    },
  };
  try {
    const url = handoffUrl("/tools/color/", { c: "#e1bb62" });
    expect(url.startsWith("/tools/color/#s=")).toBe(true);
    expect(decodeShareState(url.split("#s=")[1])).toEqual({ c: "#e1bb62" });
    // Too large for a link: open the tool empty instead of truncating.
    expect(handoffUrl("/tools/json/", { src: "x".repeat(5000) })).toBe("/tools/json/");
  } finally {
    (globalThis as { window?: unknown }).window = original;
  }
});
