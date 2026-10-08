export type Rgba = { r: number; g: number; b: number; a: number };

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
 * Avoids DOM element creation and getComputedStyle reflows.
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
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a,
  };
}

/** Fast-path parsing for hsl()/hsla() strings. */
export function parseHslFunction(str: string): Rgba | null {
  if (!str) return null;
  const s = str.trim();
  const m = s.match(
    /^hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.%]+)\s*)?\)$/i
  );
  if (!m) return null;
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

  // Standard rgb()/rgba(): "rgb(59, 130, 246)" or "rgba(59, 130, 246, 0.5)"
  let m = s.match(
    /^rgba?\(\s*([\d.]+)(%?)\s*[, ]\s*([\d.]+)(%?)\s*[, ]\s*([\d.]+)(%?)\s*(?:[,/]\s*([\d.%]+)\s*)?\)$/i
  );
  if (m) {
    const r = m[2] ? clamp255((parseFloat(m[1]) / 100) * 255) : clamp255(parseFloat(m[1]));
    const g = m[4] ? clamp255((parseFloat(m[3]) / 100) * 255) : clamp255(parseFloat(m[3]));
    const b = m[6] ? clamp255((parseFloat(m[5]) / 100) * 255) : clamp255(parseFloat(m[5]));
    const a = parseAlpha(m[7]);
    return { r, g, b, a };
  }

  // Some engines return color(srgb 0.231 0.51 0.965 / 0.5)
  m = s.match(
    /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.%]+)\s*)?\)$/i
  );
  if (m) {
    const r = clamp255(parseFloat(m[1]) * 255);
    const g = clamp255(parseFloat(m[2]) * 255);
    const b = clamp255(parseFloat(m[3]) * 255);
    const a = parseAlpha(m[4]);
    return { r, g, b, a };
  }

  return null;
}

/**
 * Parse ANY CSS color:
 * Performance optimization: check pure JS fast paths first for Hex, RGB/RGBA, and HSL/HSLA
 * to avoid DOM element creation, DOM attachment, and layout-thrashing getComputedStyle calls
 * on every color edit / picker drag. Falls back to DOM parsing for named colors (e.g. tomato)
 * and advanced CSS color functions.
 */
export function parseCssColor(input: string): Rgba | null {
  const value = input.trim();
  if (!value) return null;
  // CSS-wide keywords (and currentcolor) round-trip through the engine and
  // resolve to the document text color, so reject them as "not a color".
  // "transparent" and real named colors stay valid.
  if (/^(inherit|initial|unset|revert|revert-layer|currentcolor)$/i.test(value)) {
    return null;
  }

  // Fast path 1: Hex format (#rgb, #rgba, #rrggbb, #rrggbbaa)
  const hexParsed = parseHexColor(value);
  if (hexParsed) return hexParsed;

  // Fast path 2: rgb() / rgba() / color(srgb ...) function strings
  const rgbParsed = parseRgbFunction(value);
  if (rgbParsed) return rgbParsed;

  // Fast path 3: hsl() / hsla() function strings
  const hslParsed = parseHslFunction(value);
  if (hslParsed) return hslParsed;

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
