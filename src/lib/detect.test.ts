import { describe, expect, test } from "bun:test";

import { detect } from "./detect";
import { toolPages } from "./site";

const routes = new Set(toolPages.map((tool) => tool.href));
const top = (input: string) => detect(input).matches[0];
const kinds = (input: string) => detect(input).matches.map((match) => match.kind);

const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("detect: specific content", () => {
  test("a JWT goes to the security studio, with its algorithm read out", () => {
    expect(top(SAMPLE_JWT)).toMatchObject({
      kind: "jwt",
      href: "/studio/security/",
      detail: "HS256",
      params: { jwt: SAMPLE_JWT },
    });
  });

  test("three dotted words are not a JWT", () => {
    expect(kinds("www.example.com")).not.toContain("jwt");
    expect(kinds("aaaa.bbbb.cccc")).not.toContain("jwt");
  });

  test("UUIDs report their version", () => {
    expect(top("3f2b8c1e-9d4a-4f6b-8a2e-1c5d7e9f0a3b")).toMatchObject({
      kind: "uuid",
      detail: "version 4",
      params: { tab: "ids" },
    });
  });

  test("a ULID reports when it was minted", () => {
    expect(top("01ARZ3NDEKTSV4RRFFQ69G5FAV")).toMatchObject({
      kind: "ulid",
      detail: "created 2016-07-30",
    });
  });

  test("26 base32 characters with an implausible clock are not a ULID", () => {
    expect(kinds("7ZZZZZZZZZZZZZZZZZZZZZZZZZ")).not.toContain("ulid");
  });

  test("epoch seconds, epoch milliseconds and ISO dates are timestamps", () => {
    expect(top("1700000000")).toMatchObject({
      kind: "timestamp",
      what: "Unix time, in seconds",
      detail: "2023-11-14T22:13:20Z",
    });
    expect(top("1700000000000").what).toBe("Unix time, in milliseconds");
    expect(top("2026-11-18T09:30:00Z")).toMatchObject({ kind: "timestamp", what: "Date and time" });
    expect(top("2026-11-18").kind).toBe("timestamp");
  });

  test("ordinary numbers are not timestamps", () => {
    expect(kinds("42")).toEqual([]);
    expect(kinds("123456789")).toEqual([]);
  });

  test("colors carry a swatch", () => {
    expect(top("#e1bb62")).toMatchObject({ kind: "color", swatch: "#e1bb62", href: "/tools/color/" });
    expect(top("rgb(225 187 98)").kind).toBe("color");
    expect(top("oklch(0.8 0.12 85)").kind).toBe("color");
    expect(kinds("#nothex")).toEqual([]);
  });

  test("hex digests are recognised by length", () => {
    const sha256 = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
    expect(top(sha256)).toMatchObject({
      kind: "digest",
      what: "SHA-256 digest",
      params: { expected: sha256 },
    });
    expect(top("d41d8cd98f00b204e9800998ecf8427e").what).toBe("MD5 digest");
    expect(kinds("abcdef0123")).not.toContain("digest");
  });

  test("cron needs schedule syntax, not just five words or numbers", () => {
    expect(top("*/15 9-17 * * 1-5")).toMatchObject({ kind: "cron", params: { tab: "cron" } });
    expect(top("0 0 * * MON").kind).toBe("cron");
    expect(top("@daily").kind).toBe("cron");
    expect(kinds("1 2 3 4 5")).not.toContain("cron");
    expect(kinds("the quick brown fox jumps")).not.toContain("cron");
  });

  test("regex literals need regex syntax, so paths are left alone", () => {
    expect(top("/^[a-z]+\\d{2,}$/gi")).toMatchObject({
      kind: "regex",
      params: { p: "^[a-z]+\\d{2,}$", f: "gi" },
    });
    expect(kinds("/usr/local/bin/")).not.toContain("regex");
    expect(kinds("/(unclosed/")).not.toContain("regex");
  });

  test("a URL with a query string offers the query editor first", () => {
    const url = "https://api.example.com/v1/users?page=2&limit=50";
    expect(kinds(url)).toEqual(["url-query", "url", "url-qr"]);
    expect(top(url)).toMatchObject({ detail: "2 parameters", params: { q: url } });
    expect(kinds("https://example.com/")).toEqual(["url", "url-qr"]);
  });

  test("bare query strings and percent-encoded text", () => {
    expect(top("?utm_source=news&id=7").kind).toBe("query");
    expect(top("a=1&b=2").kind).toBe("query");
    expect(kinds("a=1")).not.toContain("query");
    expect(top("hello%20world%21")).toMatchObject({ kind: "percent", detail: "hello world!" });
  });

  test("JSON reports its shape; schemas go to the studio first", () => {
    expect(top('{"a":1,"b":[1,2]}')).toMatchObject({ kind: "json", detail: "object, 2 keys" });
    expect(top("[1, 2, 3]").detail).toBe("array, 3 items");
    expect(kinds('{"openapi":"3.1.0","info":{"title":"x","version":"1"},"paths":{}}')).toEqual([
      "openapi",
      "json",
    ]);
    expect(kinds('{"$schema":"https://json-schema.org/draft/2020-12/schema"}')).toEqual([
      "schema",
      "json",
    ]);
  });

  test("broken JSON still opens the workbench", () => {
    expect(top('{"a": 1,}')).toMatchObject({ kind: "json-invalid", href: "/tools/json/" });
  });

  test("SQL and Mermaid are recognised by how they start", () => {
    expect(top("SELECT name FROM users WHERE id = 1;")).toMatchObject({
      kind: "sql",
      detail: "SELECT statement",
    });
    expect(top("flowchart LR\n  A --> B")).toMatchObject({ kind: "mermaid", href: "/mermaid/" });
    expect(top("sequenceDiagram\n  Alice->>Bob: Hi").kind).toBe("mermaid");
    expect(kinds("select a color you like")).not.toContain("sql");
  });

  test("Base64 must decode to readable text", () => {
    expect(top("SGVsbG8sIGRldmVsb3BlciB0b29scyE=")).toMatchObject({
      kind: "base64",
      detail: "Hello, developer tools!",
      params: { bm: "decode", bu: "0" },
    });
    expect(kinds("helloworldfoobarz")).not.toContain("base64");
    expect(kinds("abcdefghijklmnop")).not.toContain("base64");
  });

  test("YAML, CSV and Markdown", () => {
    expect(top("name: Ada\nrole: lead\ntags:\n  - a\n  - b")).toMatchObject({
      kind: "yaml",
      params: { sf: "yaml" },
    });
    expect(kinds("openapi: 3.1.0\ninfo:\n  title: Sample\n  version: 1.0.0")).toEqual([
      "openapi",
      "yaml",
    ]);
    expect(top("name,role,age\nAda,lead,36\nAlan,ic,41")).toMatchObject({
      kind: "csv",
      detail: "3 columns, 2 rows",
    });
    expect(top("# Title\n\nSome **bold** text and a [link](https://example.com).").kind).toBe(
      "markdown"
    );
  });
});

describe("detect: everything else", () => {
  test("empty input yields nothing", () => {
    expect(detect("   \n ")).toEqual({ matches: [], fallbacks: [] });
  });

  test("plain prose gets general-purpose suggestions instead of a guess", () => {
    const result = detect("just a sentence about nothing in particular");
    expect(result.matches).toEqual([]);
    expect(result.fallbacks.map((item) => item.kind)).toEqual(["text-hash", "text-base64", "text-qr"]);
  });

  test("multi-line prose leads with the diff tool", () => {
    const result = detect("first line of prose\nsecond line of prose");
    expect(result.fallbacks[0]).toMatchObject({ kind: "text-diff", params: { a: expect.any(String) } });
  });

  test("specific matches suppress the general-purpose list", () => {
    expect(detect("#fff").fallbacks).toEqual([]);
  });

  test("every suggestion points at a real tool route", () => {
    const samples = [
      SAMPLE_JWT,
      "1700000000",
      "#abc",
      "*/5 * * * *",
      "https://example.com/?a=1",
      '{"a":1}',
      "SELECT 1;",
      "flowchart TD\n A-->B",
      "name: x\nrole: y",
      "a,b\n1,2",
      "# h\n\n- item",
      "plain words here",
      "line one\nline two",
    ];
    for (const sample of samples) {
      const { matches, fallbacks } = detect(sample);
      for (const item of [...matches, ...fallbacks]) {
        expect(routes.has(item.href)).toBe(true);
      }
    }
  });

  test("very large input skips the deep scan but still answers", () => {
    const big = `{"k":"${"x".repeat(450_000)}"}`;
    expect(top(big)).toMatchObject({ kind: "json", href: "/tools/json/" });
    expect(top(big).detail).toBeUndefined();
  });
});
