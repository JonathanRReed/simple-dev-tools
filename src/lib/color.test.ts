import { describe, expect, test } from "bun:test";
import {
  parseHexColor,
  parseHslFunction,
  parseRgbFunction,
  parseCssColor,
} from "./color";

describe("parseHexColor", () => {
  test("parses 3-digit hex", () => {
    expect(parseHexColor("#3b8")).toEqual({ r: 51, g: 187, b: 136, a: 1 });
  });

  test("parses 4-digit hex with alpha", () => {
    expect(parseHexColor("#3b8f")).toEqual({ r: 51, g: 187, b: 136, a: 1 });
  });

  test("parses 6-digit hex", () => {
    expect(parseHexColor("#3b82f6")).toEqual({ r: 59, g: 130, b: 246, a: 1 });
  });

  test("parses 8-digit hex with alpha", () => {
    const parsed = parseHexColor("#3b82f680");
    expect(parsed?.r).toBe(59);
    expect(parsed?.g).toBe(130);
    expect(parsed?.b).toBe(246);
    expect(parsed?.a).toBeCloseTo(128 / 255, 3);
  });

  test("returns null for invalid hex lengths or chars", () => {
    expect(parseHexColor("#12345")).toBeNull();
    expect(parseHexColor("#xyz")).toBeNull();
  });
});

describe("parseRgbFunction", () => {
  test("parses standard rgb() and rgba()", () => {
    expect(parseRgbFunction("rgb(59, 130, 246)")).toEqual({ r: 59, g: 130, b: 246, a: 1 });
    expect(parseRgbFunction("rgba(59, 130, 246, 0.5)")).toEqual({ r: 59, g: 130, b: 246, a: 0.5 });
  });

  test("parses percentage rgb()", () => {
    expect(parseRgbFunction("rgb(100%, 0%, 0%)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
});

describe("parseHslFunction", () => {
  test("parses hsl() and hsla()", () => {
    expect(parseHslFunction("hsl(0, 100%, 50%)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseHslFunction("hsl(217, 91%, 60%)")).toEqual({ r: 60, g: 131, b: 246, a: 1 });
    expect(parseHslFunction("hsla(120, 100%, 50%, 0.5)")).toEqual({ r: 0, g: 255, b: 0, a: 0.5 });
  });
});

describe("parseCssColor", () => {
  test("uses fast path for hex colors", () => {
    expect(parseCssColor("#3b82f6")).toEqual({ r: 59, g: 130, b: 246, a: 1 });
  });

  test("uses fast path for rgb colors", () => {
    expect(parseCssColor("rgb(59, 130, 246)")).toEqual({ r: 59, g: 130, b: 246, a: 1 });
  });

  test("uses fast path for hsl colors", () => {
    expect(parseCssColor("hsl(217, 91%, 60%)")).toEqual({ r: 60, g: 131, b: 246, a: 1 });
  });

  test("rejects CSS-wide keywords", () => {
    expect(parseCssColor("inherit")).toBeNull();
    expect(parseCssColor("initial")).toBeNull();
    expect(parseCssColor("unset")).toBeNull();
  });
});
