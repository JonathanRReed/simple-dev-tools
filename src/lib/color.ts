export type Rgba = { r: number; g: number; b: number; a: number };

// Deliberately narrow fast paths. Advanced CSS expressions/units still go
// through the browser below. CSS whitespace excludes non-breaking spaces.
const NUMBER = String.raw`[+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?`;
const WS = String.raw`[\t\n\f\r ]`;
const COMPONENT = `(${NUMBER}%?)`;
const RGB_LEGACY = new RegExp(`^rgba?\\(${WS}*${COMPONENT}${WS}*,${WS}*${COMPONENT}${WS}*,${WS}*${COMPONENT}${WS}*(?:,${WS}*${COMPONENT}${WS}*)?\\)$`, "i");
const RGB_MODERN = new RegExp(`^rgba?\\(${WS}*${COMPONENT}${WS}+${COMPONENT}${WS}+${COMPONENT}${WS}*(?:/${WS}*${COMPONENT}${WS}*)?\\)$`, "i");
const HSL_LEGACY = new RegExp(`^hsla?\\(${WS}*(${NUMBER})(?:deg)?${WS}*,${WS}*(${NUMBER})%${WS}*,${WS}*(${NUMBER})%${WS}*(?:,${WS}*${COMPONENT}${WS}*)?\\)$`, "i");
const HSL_MODERN = new RegExp(`^hsla?\\(${WS}*(${NUMBER})(?:deg)?${WS}+(${NUMBER})%${WS}+(${NUMBER})%${WS}*(?:/${WS}*${COMPONENT}${WS}*)?\\)$`, "i");
const SRGB = new RegExp(`^color\\(${WS}*srgb${WS}+(${NUMBER})${WS}+(${NUMBER})${WS}+(${NUMBER})${WS}*(?:/${WS}*${COMPONENT}${WS}*)?\\)$`, "i");

function finiteComponents(match: RegExpMatchArray): boolean {
  return match.slice(1).every(value => value === undefined || Number.isFinite(Number(value.replace(/%$/, ""))));
}

export function parseAlpha(raw: string | undefined): number {
  if (raw == null || raw === "") return 1;
  if (raw.endsWith("%")) {
    return clamp01(parseFloat(raw) / 100);
  }
  return clamp01(parseFloat(raw));
}

export function clamp255(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(255, Math.max(0, n));
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Fast-path parsing for Hex color formats (#rgb, #rgba, #rrggbb, #rrggbbaa).
 * Avoids DOM element creation and computed-style reads.
 */
export function parseHexColor(input: string): Rgba | null {
  const hexMatch = input.match(/^#([0-9a-f]{3,8})$/i);
  if (!hexMatch) return null;
  const hex = hexMatch[1];
  const len = hex.length;
  if (len === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1,
    };
  }
  if (len === 4) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: parseInt(hex[3] + hex[3], 16) / 255,
    };
  }
  if (len === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  if (len === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: parseInt(hex.slice(6, 8), 16) / 255,
    };
  }
  return null;
}

export function hslToRgb(h: number, s: number, l: number, a: number): Rgba {
  h = ((h % 360) + 360) % 360;
  s = clamp01(s);
  l = clamp01(l);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
    a,
  };
}

/** Fast-path parsing for hsl()/hsla() strings. */
export function parseHslFunction(str: string): Rgba | null {
  if (!str) return null;
  const s = str.trim();
  const m = s.match(HSL_LEGACY) ?? s.match(HSL_MODERN);
  if (!m || !finiteComponents(m)) return null;
  const h = parseFloat(m[1]);
  const sPct = parseFloat(m[2]) / 100;
  const lPct = parseFloat(m[3]) / 100;
  const a = parseAlpha(m[4]);
  return hslToRgb(h, sPct, lPct, a);
}

/** Parse an rgb()/rgba()/color(srgb ...) string into a 0..255 / 0..1 Rgba. */
export function parseRgbFunction(str: string): Rgba | null {
  if (!str) return null;
  const s = str.trim();

  // Legacy comma syntax requires all channels to use the same unit.
  const legacy = s.match(RGB_LEGACY);
  let m = legacy ?? s.match(RGB_MODERN);
  if (m) {
    if (!finiteComponents(m)) return null;
    if (legacy && !m.slice(1, 4).every(value => value.endsWith("%") === m![1].endsWith("%"))) return null;
    const channel = (value: string) => value.endsWith("%") ? clamp01(parseFloat(value) / 100) * 255 : clamp255(parseFloat(value));
    const r = channel(m[1]);
    const g = channel(m[2]);
    const b = channel(m[3]);
    const a = parseAlpha(m[4]);
    return { r, g, b, a };
  }

  // Some engines return color(srgb 0.231 0.51 0.965 / 0.5)
  m = s.match(SRGB);
  if (m) {
    if (!finiteComponents(m)) return null;
    const r = clamp01(parseFloat(m[1])) * 255;
    const g = clamp01(parseFloat(m[2])) * 255;
    const b = clamp01(parseFloat(m[3])) * 255;
    const a = parseAlpha(m[4]);
    return { r, g, b, a };
  }

  return null;
}

/**
 * Fast-path dictionary for CSS Level 4 named colors + transparent.
 * Avoids DOM element creation and forced layout recalculations for named colors.
 */
const NAMED_COLORS: Record<string, Rgba> = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  aliceblue: { r: 240, g: 248, b: 255, a: 1 },
  antiquewhite: { r: 250, g: 235, b: 215, a: 1 },
  aqua: { r: 0, g: 255, b: 255, a: 1 },
  aquamarine: { r: 127, g: 255, b: 212, a: 1 },
  azure: { r: 240, g: 255, b: 255, a: 1 },
  beige: { r: 245, g: 245, b: 220, a: 1 },
  bisque: { r: 255, g: 228, b: 196, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  blanchedalmond: { r: 255, g: 235, b: 205, a: 1 },
  blue: { r: 0, g: 0, b: 255, a: 1 },
  blueviolet: { r: 138, g: 43, b: 226, a: 1 },
  brown: { r: 165, g: 42, b: 42, a: 1 },
  burlywood: { r: 222, g: 184, b: 135, a: 1 },
  cadetblue: { r: 95, g: 158, b: 160, a: 1 },
  chartreuse: { r: 127, g: 255, b: 0, a: 1 },
  chocolate: { r: 210, g: 105, b: 30, a: 1 },
  coral: { r: 255, g: 127, b: 80, a: 1 },
  cornflowerblue: { r: 100, g: 149, b: 237, a: 1 },
  cornsilk: { r: 255, g: 248, b: 220, a: 1 },
  crimson: { r: 220, g: 20, b: 60, a: 1 },
  cyan: { r: 0, g: 255, b: 255, a: 1 },
  darkblue: { r: 0, g: 0, b: 139, a: 1 },
  darkcyan: { r: 0, g: 139, b: 139, a: 1 },
  darkgoldenrod: { r: 184, g: 134, b: 11, a: 1 },
  darkgray: { r: 169, g: 169, b: 169, a: 1 },
  darkgreen: { r: 0, g: 100, b: 0, a: 1 },
  darkgrey: { r: 169, g: 169, b: 169, a: 1 },
  darkkhaki: { r: 189, g: 183, b: 107, a: 1 },
  darkmagenta: { r: 139, g: 0, b: 139, a: 1 },
  darkolivegreen: { r: 85, g: 107, b: 47, a: 1 },
  darkorange: { r: 255, g: 140, b: 0, a: 1 },
  darkorchid: { r: 153, g: 50, b: 204, a: 1 },
  darkred: { r: 139, g: 0, b: 0, a: 1 },
  darksalmon: { r: 233, g: 150, b: 122, a: 1 },
  darkseagreen: { r: 143, g: 188, b: 143, a: 1 },
  darkslateblue: { r: 72, g: 61, b: 139, a: 1 },
  darkslategray: { r: 47, g: 79, b: 79, a: 1 },
  darkslategrey: { r: 47, g: 79, b: 79, a: 1 },
  darkturquoise: { r: 0, g: 206, b: 209, a: 1 },
  darkviolet: { r: 148, g: 0, b: 211, a: 1 },
  deeppink: { r: 255, g: 20, b: 147, a: 1 },
  deepskyblue: { r: 0, g: 191, b: 255, a: 1 },
  dimgray: { r: 105, g: 105, b: 105, a: 1 },
  dimgrey: { r: 105, g: 105, b: 105, a: 1 },
  dodgerblue: { r: 30, g: 144, b: 255, a: 1 },
  firebrick: { r: 178, g: 34, b: 34, a: 1 },
  floralwhite: { r: 255, g: 250, b: 240, a: 1 },
  forestgreen: { r: 34, g: 139, b: 34, a: 1 },
  fuchsia: { r: 255, g: 0, b: 255, a: 1 },
  gainsboro: { r: 220, g: 220, b: 220, a: 1 },
  ghostwhite: { r: 248, g: 248, b: 255, a: 1 },
  gold: { r: 255, g: 215, b: 0, a: 1 },
  goldenrod: { r: 218, g: 165, b: 32, a: 1 },
  gray: { r: 128, g: 128, b: 128, a: 1 },
  green: { r: 0, g: 128, b: 0, a: 1 },
  greenyellow: { r: 173, g: 255, b: 47, a: 1 },
  grey: { r: 128, g: 128, b: 128, a: 1 },
  honeydew: { r: 240, g: 255, b: 240, a: 1 },
  hotpink: { r: 255, g: 105, b: 180, a: 1 },
  indianred: { r: 205, g: 92, b: 92, a: 1 },
  indigo: { r: 75, g: 0, b: 130, a: 1 },
  ivory: { r: 255, g: 255, b: 240, a: 1 },
  khaki: { r: 240, g: 230, b: 140, a: 1 },
  lavender: { r: 230, g: 230, b: 250, a: 1 },
  lavenderblush: { r: 255, g: 240, b: 245, a: 1 },
  lawngreen: { r: 124, g: 252, b: 0, a: 1 },
  lemonchiffon: { r: 255, g: 250, b: 205, a: 1 },
  lightblue: { r: 173, g: 216, b: 230, a: 1 },
  lightcoral: { r: 240, g: 128, b: 128, a: 1 },
  lightcyan: { r: 224, g: 255, b: 255, a: 1 },
  lightgoldenrodyellow: { r: 250, g: 250, b: 210, a: 1 },
  lightgray: { r: 211, g: 211, b: 211, a: 1 },
  lightgreen: { r: 144, g: 238, b: 144, a: 1 },
  lightgrey: { r: 211, g: 211, b: 211, a: 1 },
  lightpink: { r: 255, g: 182, b: 193, a: 1 },
  lightsalmon: { r: 255, g: 160, b: 122, a: 1 },
  lightseagreen: { r: 32, g: 178, b: 170, a: 1 },
  lightskyblue: { r: 135, g: 206, b: 250, a: 1 },
  lightslategray: { r: 119, g: 136, b: 153, a: 1 },
  lightslategrey: { r: 119, g: 136, b: 153, a: 1 },
  lightsteelblue: { r: 176, g: 196, b: 222, a: 1 },
  lightyellow: { r: 255, g: 255, b: 224, a: 1 },
  lime: { r: 0, g: 255, b: 0, a: 1 },
  limegreen: { r: 50, g: 205, b: 50, a: 1 },
  linen: { r: 250, g: 240, b: 230, a: 1 },
  magenta: { r: 255, g: 0, b: 255, a: 1 },
  maroon: { r: 128, g: 0, b: 0, a: 1 },
  mediumaquamarine: { r: 102, g: 205, b: 170, a: 1 },
  mediumblue: { r: 0, g: 0, b: 205, a: 1 },
  mediumorchid: { r: 186, g: 85, b: 211, a: 1 },
  mediumpurple: { r: 147, g: 112, b: 219, a: 1 },
  mediumseagreen: { r: 60, g: 179, b: 113, a: 1 },
  mediumslateblue: { r: 123, g: 104, b: 238, a: 1 },
  mediumspringgreen: { r: 0, g: 250, b: 154, a: 1 },
  mediumturquoise: { r: 72, g: 209, b: 204, a: 1 },
  mediumvioletred: { r: 199, g: 21, b: 133, a: 1 },
  midnightblue: { r: 25, g: 25, b: 112, a: 1 },
  mintcream: { r: 245, g: 255, b: 250, a: 1 },
  mistyrose: { r: 255, g: 228, b: 225, a: 1 },
  moccasin: { r: 255, g: 228, b: 181, a: 1 },
  navajowhite: { r: 255, g: 222, b: 173, a: 1 },
  navy: { r: 0, g: 0, b: 128, a: 1 },
  oldlace: { r: 253, g: 245, b: 230, a: 1 },
  olive: { r: 128, g: 128, b: 0, a: 1 },
  olivedrab: { r: 107, g: 142, b: 35, a: 1 },
  orange: { r: 255, g: 165, b: 0, a: 1 },
  orangered: { r: 255, g: 69, b: 0, a: 1 },
  orchid: { r: 218, g: 112, b: 214, a: 1 },
  palegoldenrod: { r: 238, g: 232, b: 170, a: 1 },
  palegreen: { r: 152, g: 251, b: 152, a: 1 },
  paleturquoise: { r: 175, g: 238, b: 238, a: 1 },
  palevioletred: { r: 219, g: 112, b: 147, a: 1 },
  papayawhip: { r: 255, g: 239, b: 213, a: 1 },
  peachpuff: { r: 255, g: 218, b: 185, a: 1 },
  peru: { r: 205, g: 133, b: 63, a: 1 },
  pink: { r: 255, g: 192, b: 203, a: 1 },
  plum: { r: 221, g: 160, b: 221, a: 1 },
  powderblue: { r: 176, g: 224, b: 230, a: 1 },
  purple: { r: 128, g: 0, b: 128, a: 1 },
  rebeccapurple: { r: 102, g: 51, b: 153, a: 1 },
  red: { r: 255, g: 0, b: 0, a: 1 },
  rosybrown: { r: 188, g: 143, b: 143, a: 1 },
  royalblue: { r: 65, g: 105, b: 225, a: 1 },
  saddlebrown: { r: 139, g: 69, b: 19, a: 1 },
  salmon: { r: 250, g: 128, b: 114, a: 1 },
  sandybrown: { r: 244, g: 164, b: 96, a: 1 },
  seagreen: { r: 46, g: 139, b: 87, a: 1 },
  seashell: { r: 255, g: 245, b: 238, a: 1 },
  sienna: { r: 160, g: 82, b: 45, a: 1 },
  silver: { r: 192, g: 192, b: 192, a: 1 },
  skyblue: { r: 135, g: 206, b: 235, a: 1 },
  slateblue: { r: 106, g: 90, b: 205, a: 1 },
  slategray: { r: 112, g: 128, b: 144, a: 1 },
  slategrey: { r: 112, g: 128, b: 144, a: 1 },
  snow: { r: 255, g: 250, b: 250, a: 1 },
  springgreen: { r: 0, g: 255, b: 127, a: 1 },
  steelblue: { r: 70, g: 130, b: 180, a: 1 },
  tan: { r: 210, g: 180, b: 140, a: 1 },
  teal: { r: 0, g: 128, b: 128, a: 1 },
  thistle: { r: 216, g: 191, b: 216, a: 1 },
  tomato: { r: 255, g: 99, b: 71, a: 1 },
  turquoise: { r: 64, g: 224, b: 208, a: 1 },
  violet: { r: 238, g: 130, b: 238, a: 1 },
  wheat: { r: 245, g: 222, b: 179, a: 1 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  whitesmoke: { r: 245, g: 245, b: 245, a: 1 },
  yellow: { r: 255, g: 255, b: 0, a: 1 },
  yellowgreen: { r: 154, g: 205, b: 50, a: 1 },
};

/** Bounded LRU cache for successful, document-independent fast-path results. */
const PARSE_COLOR_CACHE_MAX_SIZE = 256;
const parseColorCache = new Map<string, Rgba>();

function parseCssColorFast(value: string): Rgba | null {
  // Fast path 1: Hex format (#rgb, #rgba, #rrggbb, #rrggbbaa)
  const hexParsed = parseHexColor(value);
  if (hexParsed) return hexParsed;

  // Fast path 2: rgb() / rgba() / color(srgb ...) function strings
  const rgbParsed = parseRgbFunction(value);
  if (rgbParsed) return rgbParsed;

  // Fast path 3: hsl() / hsla() function strings
  const hslParsed = parseHslFunction(value);
  if (hslParsed) return hslParsed;

  // Fast path 4: Named CSS colors (e.g. tomato, rebeccapurple, transparent)
  const name = value.toLowerCase();
  if (Object.hasOwn(NAMED_COLORS, name)) return { ...NAMED_COLORS[name] };

  return null;
}

function parseCssColorWithBrowser(value: string): Rgba | null {
  if (typeof document === "undefined") return null;

  try {
    const el = document.createElement("span");
    // A sentinel the user can never legitimately produce via a *different*
    // string; if both sentinels survive, the input was rejected outright.
    el.style.color = "rgb(1, 2, 3)";
    el.style.setProperty("color", value);
    const sentinelA = el.style.color;

    el.style.color = "rgb(4, 5, 6)";
    el.style.setProperty("color", value);
    const sentinelB = el.style.color;

    // If the browser refused to set the property at all, style.color reflects
    // the prior sentinel value in both passes and they differ → invalid.
    if (sentinelA === "" && sentinelB === "") return null;
    if (sentinelA !== sentinelB) return null;
    if (sentinelA === "") return null;

    // Now read the *computed* form, which normalizes to rgb()/rgba().
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);

    return parseRgbFunction(computed);
  } catch {
    return null;
  }
}

/**
 * Parse ANY CSS color:
 * Performance optimization: check pure JS fast paths first for Hex, RGB/RGBA, HSL/HSLA,
 * and standard CSS named colors to avoid DOM element creation, DOM attachment, and computed-style
 * reads on every color edit / picker drag / keystroke. A 256-entry LRU cache saves
 * repeated fast-path parsing. Browser resolutions and failures are never cached
 * because they can change with the document's custom properties or color scheme.
 */
export function parseCssColor(input: string): Rgba | null {
  const value = input.trim();
  if (!value) return null;

  // These keywords resolve to the document text color, not a standalone color.
  if (/^(inherit|initial|unset|revert|revert-layer|currentcolor)$/i.test(value)) {
    return null;
  }

  const cached = parseColorCache.get(value);
  if (cached !== undefined) {
    parseColorCache.delete(value);
    parseColorCache.set(value, cached);
    return { ...cached };
  }

  const result = parseCssColorFast(value);
  if (!result) return parseCssColorWithBrowser(value);

  if (parseColorCache.size >= PARSE_COLOR_CACHE_MAX_SIZE) {
    const firstKey = parseColorCache.keys().next().value;
    if (firstKey !== undefined) parseColorCache.delete(firstKey);
  }
  parseColorCache.set(value, result);
  return { ...result };
}
