import { describe, expect, test } from "bun:test";
import {
  parseHexColor,
  parseHslFunction,
  parseRgbFunction,
  parseCssColor,
} from "./color";

describe("fast-path validation", () => {
  test.each([
    "rgb(1..2, 3, 4)", "rgba(1, 2, 3, ..5)", "rgb(., 0, 0)",
    "rgb(1, 2 3)", "rgb(1 2, 3)", "rgb(1, 2, 3 / .5)",
    "rgb(1 2 3, .5)", "rgb(10%, 2, 3)", "rgb(1., 2, 3)",
    "rgba(1, 2, 3, 50%%)", "hsl(1..2, 50%, 50%)",
    "hsl(30, 50% 50%)", "hsl(30 50% 50%, .5)",
    "color(srgb 1..2 0 0)", "rgb(1\u00a02\u00a03)",
  ])("does not accept malformed CSS %s", (value) => {
    expect(parseCssColor(value)).toBeNull();
  });

  test("preserves independently calculated fractional HSL channels", () => {
    const result = parseHslFunction("hsl(30, 1%, 1%)")!;
    expect(result.r).toBeCloseTo(2.5755, 10);
    expect(result.g).toBeCloseTo(2.55, 10);
    expect(result.b).toBeCloseTo(2.5245, 10);
    // Integer formats may still round all three channels to the same byte.
    expect([result.r, result.g, result.b].map(Math.round)).toEqual([3, 3, 3]);
  });

  test("parses valid modern syntax, signed numbers, exponents, and alpha", () => {
    expect(parseRgbFunction("rgb(+1e2 0% .5 / 50%)")).toEqual({ r: 100, g: 0, b: .5, a: .5 });
    expect(parseRgbFunction("rgb(-10, 300, 0)")).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(parseHslFunction("hsl(-120deg 100% 50% / .5)")).toEqual({ r: 0, g: 0, b: 255, a: .5 });
  });

  test("leaves advanced syntax outside the fast paths", () => {
    expect(parseRgbFunction("rgb(calc(10 + 20) 0 0)")).toBeNull();
    expect(parseHslFunction("hsl(.5turn 100% 50%)")).toBeNull();
    expect(parseRgbFunction("rgb(from red r g b)")).toBeNull();
  });

  test("clamps very large finite channels before scaling", () => {
    expect(parseRgbFunction("rgb(1e308% 0% 0%)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseRgbFunction("color(srgb 1e307 0 0)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
});

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
    const blue = parseHslFunction("hsl(217, 91%, 60%)")!;
    expect(blue.r).toBeCloseTo(60.18, 10);
    expect(blue.g).toBeCloseTo(131.342, 10);
    expect(blue.b).toBeCloseTo(245.82, 10);
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
    const blue = parseCssColor("hsl(217, 91%, 60%)")!;
    expect(blue.r).toBeCloseTo(60.18, 10);
    expect(blue.g).toBeCloseTo(131.342, 10);
    expect(blue.b).toBeCloseTo(245.82, 10);
  });

  test("rejects CSS-wide keywords", () => {
    expect(parseCssColor("inherit")).toBeNull();
    expect(parseCssColor("initial")).toBeNull();
    expect(parseCssColor("unset")).toBeNull();
  });
});
