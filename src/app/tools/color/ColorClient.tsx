"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ResultPanel } from "@/components/ui/result-panel";

/* ------------------------------------------------------------------ *
 * Constants
 * ------------------------------------------------------------------ */

const DEFAULT_COLOR = "#3b82f6";
const SAMPLE_COLOR = "rebeccapurple";
const DEFAULT_BG = "#ffffff";

/** localStorage key for the last-used color. Input only — never secrets.
 *  Guarded for static export (typeof window + try/catch). */
const STORAGE_KEY = "sdt:color:value";

/* ------------------------------------------------------------------ *
 * Persistence (guarded)
 * ------------------------------------------------------------------ */

function loadStoredColor(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistColor(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore (private mode / quota) */
  }
}

function clearStoredColor(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ *
 * RGBA type + parsing
 * ------------------------------------------------------------------ */

type Rgba = { r: number; g: number; b: number; a: number };

/**
 * Parse ANY CSS color by leaning on the browser's own engine: write the string
 * to a detached element's style.color and read getComputedStyle().color back.
 * The computed value is always rgb()/rgba() (or color(srgb ...) in some engines).
 * If the assignment is rejected (invalid color), style.color stays at our
 * sentinel and we return null.
 */
function parseCssColor(input: string): Rgba | null {
  const value = input.trim();
  if (!value) return null;
  // CSS-wide keywords (and currentcolor) round-trip through the engine and
  // resolve to the document text color, so reject them as "not a color".
  // "transparent" and real named colors stay valid.
  if (/^(inherit|initial|unset|revert|revert-layer|currentcolor)$/i.test(value)) {
    return null;
  }
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

/** Parse an rgb()/rgba()/color(srgb ...) string into a 0..255 / 0..1 Rgba. */
function parseRgbFunction(str: string): Rgba | null {
  if (!str) return null;
  const s = str.trim();

  // Standard rgb()/rgba(): "rgb(59, 130, 246)" or "rgba(59, 130, 246, 0.5)"
  let m = s.match(
    /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.%]+)\s*)?\)$/i
  );
  if (m) {
    const r = clamp255(parseFloat(m[1]));
    const g = clamp255(parseFloat(m[2]));
    const b = clamp255(parseFloat(m[3]));
    const a = parseAlpha(m[4]);
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

function parseAlpha(raw: string | undefined): number {
  if (raw == null || raw === "") return 1;
  if (raw.endsWith("%")) {
    return clamp01(parseFloat(raw) / 100);
  }
  return clamp01(parseFloat(raw));
}

function clamp255(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(255, Math.max(0, n));
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/* ------------------------------------------------------------------ *
 * Formatting: HEX / HEX8 / RGB / HSL
 * ------------------------------------------------------------------ */

function to2Hex(n: number): string {
  return Math.round(clamp255(n)).toString(16).padStart(2, "0");
}

function toHex({ r, g, b }: Rgba): string {
  return `#${to2Hex(r)}${to2Hex(g)}${to2Hex(b)}`;
}

function toHex8({ r, g, b, a }: Rgba): string {
  const alpha = Math.round(clamp01(a) * 255);
  return `#${to2Hex(r)}${to2Hex(g)}${to2Hex(b)}${alpha.toString(16).padStart(2, "0")}`;
}

function toRgbString({ r, g, b, a }: Rgba): string {
  const R = Math.round(clamp255(r));
  const G = Math.round(clamp255(g));
  const B = Math.round(clamp255(b));
  if (a < 1) {
    return `rgba(${R}, ${G}, ${B}, ${round(a, 3)})`;
  }
  return `rgb(${R}, ${G}, ${B})`;
}

/** Convert sRGB 0..255 → HSL with H in degrees, S/L in 0..1. */
function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
  const rn = clamp255(r) / 255;
  const gn = clamp255(g) / 255;
  const bn = clamp255(b) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function toHslString(rgba: Rgba): string {
  const { h, s, l } = rgbToHsl(rgba);
  const H = Math.round(((h % 360) + 360) % 360);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);
  if (rgba.a < 1) {
    return `hsla(${H}, ${S}%, ${L}%, ${round(rgba.a, 3)})`;
  }
  return `hsl(${H}, ${S}%, ${L}%)`;
}

/* ------------------------------------------------------------------ *
 * OKLCH: sRGB → linear → LMS (M1) → cbrt → OKLab (M2) → LCh
 * ------------------------------------------------------------------ */

/** Gamma-decode a single sRGB channel (0..1) to linear-light. */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** sRGB 0..255 Rgba → OKLab {L, a, b}. */
function rgbToOklab({ r, g, b }: Rgba): { L: number; a: number; bb: number } {
  const lr = srgbToLinear(clamp255(r) / 255);
  const lg = srgbToLinear(clamp255(g) / 255);
  const lb = srgbToLinear(clamp255(b) / 255);

  // Linear sRGB → LMS (M1)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // LMS' → OKLab (M2)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  return { L, a, bb };
}

function toOklchString(rgba: Rgba): string {
  const { L, a, bb } = rgbToOklab(rgba);
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  H = ((H % 360) + 360) % 360;

  const Lpct = round(L * 100, 1);
  const Cstr = round(C, 3);
  // Hue is undefined for achromatic colors; emit 0 to keep the string valid.
  const Hstr = C < 1e-4 ? 0 : round(H, 1);

  if (rgba.a < 1) {
    return `oklch(${Lpct}% ${Cstr} ${Hstr} / ${round(rgba.a, 3)})`;
  }
  return `oklch(${Lpct}% ${Cstr} ${Hstr})`;
}

/* ------------------------------------------------------------------ *
 * WCAG contrast
 * ------------------------------------------------------------------ */

/** WCAG relative luminance from sRGB 0..255. */
function relativeLuminance({ r, g, b }: Rgba): number {
  const lin = (c: number) => {
    const cs = clamp255(c) / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Composite a translucent color over an opaque backdrop (for honest contrast). */
function flatten(top: Rgba, bottom: Rgba): Rgba {
  const a = clamp01(top.a);
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
    a: 1,
  };
}

function contrastRatio(fg: Rgba, bg: Rgba): number {
  // Flatten fg over bg so alpha is accounted for; bg's own alpha (if any) is
  // composited over white as a reasonable default backdrop.
  const solidBg = bg.a < 1 ? flatten(bg, { r: 255, g: 255, b: 255, a: 1 }) : bg;
  const solidFg = fg.a < 1 ? flatten(fg, solidBg) : fg;
  const l1 = relativeLuminance(solidFg);
  const l2 = relativeLuminance(solidBg);
  const lmax = Math.max(l1, l2);
  const lmin = Math.min(l1, l2);
  return (lmax + 0.05) / (lmin + 0.05);
}

/* ------------------------------------------------------------------ *
 * Tints & shades
 * ------------------------------------------------------------------ */

function mix(a: Rgba, b: Rgba, t: number): Rgba {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: 1,
  };
}

const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };
const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

/** A 9-stop ramp: dark (mixed toward black) → base → light (toward white). */
function buildRamp(base: Rgba): { hex: string; label: string }[] {
  const opaque: Rgba = { ...base, a: 1 };
  const stops: { hex: string; label: string }[] = [];
  // 4 shades (toward black), the base, 4 tints (toward white).
  const shadeMix = [0.8, 0.6, 0.4, 0.2];
  for (const t of shadeMix) {
    stops.push({ hex: toHex(mix(opaque, BLACK, t)), label: `−${Math.round(t * 100)}%` });
  }
  stops.push({ hex: toHex(opaque), label: "base" });
  const tintMix = [0.2, 0.4, 0.6, 0.8];
  for (const t of tintMix) {
    stops.push({ hex: toHex(mix(opaque, WHITE, t)), label: `+${Math.round(t * 100)}%` });
  }
  return stops;
}

/* ------------------------------------------------------------------ *
 * Misc helpers
 * ------------------------------------------------------------------ */

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

/** Pick black or white text for a given background, whichever has more contrast. */
function readableText(bg: Rgba): string {
  const onWhite = contrastRatio({ r: 255, g: 255, b: 255, a: 1 }, bg);
  const onBlack = contrastRatio({ r: 0, g: 0, b: 0, a: 1 }, bg);
  return onBlack >= onWhite ? "#000000" : "#ffffff";
}

/* ------------------------------------------------------------------ *
 * Sub-components
 * ------------------------------------------------------------------ */

function PassBadge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-2 border-border bg-background px-3 py-2">
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
      <span
        className={
          "font-mono text-xs font-bold uppercase tracking-wider " +
          (ok ? "text-rp-foam" : "text-destructive")
        }
      >
        {ok ? "Pass" : "Fail"}
      </span>
    </div>
  );
}

/** Copy text to the clipboard with a non-secure-context fallback. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to execCommand */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** A click-to-copy ramp swatch: square color block over its hex label. */
function Swatch({ hex, label }: { hex: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const onClick = async () => {
    const ok = await copyText(hex);
    setCopied(ok);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Copy ${hex}`}
      title={`${label} · ${hex}`}
      className="flex flex-col items-stretch border-2 border-border bg-card text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="h-12 w-full border-b-2 border-border"
        style={{ backgroundColor: hex }}
      />
      <span className="px-1 py-1 font-mono text-[0.65rem] leading-tight text-foreground">
        {copied ? "Copied" : hex}
      </span>
    </button>
  );
}

/** A read-only conversion row with a swatch-free monospace value + copy. */
function ConvRow({ title, value }: { title: string; value: string }) {
  return (
    <ResultPanel title={title} copyValue={value}>
      <span className="font-mono text-sm break-all text-foreground">{value}</span>
    </ResultPanel>
  );
}

/* ------------------------------------------------------------------ *
 * Main component
 * ------------------------------------------------------------------ */

export default function ColorClient() {
  const [text, setText] = useState(DEFAULT_COLOR);
  const [fgText, setFgText] = useState(DEFAULT_COLOR);
  const [bgText, setBgText] = useState(DEFAULT_BG);
  const hydratedRef = useRef(false);

  // Hydrate the last color after mount so server markup (DEFAULT_COLOR) and the
  // first client render match, avoiding a hydration mismatch.
  useEffect(() => {
    const stored = loadStoredColor();
    if (stored && stored !== DEFAULT_COLOR) {
      setText(stored);
      setFgText(stored);
    }
    hydratedRef.current = true;
  }, []);

  // Parse the primary color.
  const parsed = useMemo(() => parseCssColor(text), [text]);

  // Persist whenever the primary color changes to a valid value (post-hydration).
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (parsed) persistColor(text);
  }, [text, parsed]);

  const fg = useMemo(() => parseCssColor(fgText), [fgText]);
  const bg = useMemo(() => parseCssColor(bgText), [bgText]);

  const ramp = useMemo(() => (parsed ? buildRamp(parsed) : null), [parsed]);

  // Conversions for the primary color.
  const conv = useMemo(() => {
    if (!parsed) return null;
    return {
      hex: toHex(parsed),
      hex8: parsed.a < 1 ? toHex8(parsed) : null,
      rgb: toRgbString(parsed),
      hsl: toHslString(parsed),
      oklch: toOklchString(parsed),
    };
  }, [parsed]);

  // Contrast results.
  const contrast = useMemo(() => {
    if (!fg || !bg) return null;
    const ratio = contrastRatio(fg, bg);
    // Compare badges against the SAME rounded value the user sees, so a ratio
    // displayed as e.g. "4.50:1" can't disagree with its PASS/FAIL badges.
    const shown = Math.round(ratio * 100) / 100;
    return {
      ratio,
      ratioStr: `${shown.toFixed(2)}:1`,
      aaNormal: shown >= 4.5,
      aaLarge: shown >= 3,
      aaaNormal: shown >= 7,
      aaaLarge: shown >= 4.5,
    };
  }, [fg, bg]);

  // The <input type=color> can only hold #rrggbb, so feed it the parsed hex.
  const pickerHex = parsed ? toHex(parsed) : "#000000";
  const fgPickerHex = fg ? toHex(fg) : "#000000";
  const bgPickerHex = bg ? toHex(bg) : "#ffffff";

  const reset = () => {
    clearStoredColor();
    setText(DEFAULT_COLOR);
    setFgText(DEFAULT_COLOR);
    setBgText(DEFAULT_BG);
  };

  const loadSample = () => {
    setText(SAMPLE_COLOR);
    setFgText(SAMPLE_COLOR);
    setBgText(DEFAULT_BG);
  };

  const toolbar = (
    <>
      <Button variant="secondary" size="sm" onClick={loadSample}>
        <Sparkles aria-hidden="true" />
        Sample
      </Button>
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcw aria-hidden="true" />
        Reset
      </Button>
    </>
  );

  return (
    <ToolShell eyebrow="Color · Local" toolbar={toolbar}>
      <div className="space-y-8">
        {/* ---- Input row ---- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
          <div className="flex flex-col gap-3">
            <Field
              label="CSS color"
              htmlFor="color-input"
              hint="Hex (#rgb / #rrggbb / #rrggbbaa), rgb()/rgba(), hsl()/hsla(), or a named color."
            >
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Color picker"
                  value={pickerHex}
                  onChange={(e) => {
                    setText(e.target.value);
                  }}
                  className="h-9 w-14 shrink-0 border-2 border-border p-0"
                />
                <Input
                  id="color-input"
                  value={text}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  onChange={(e) => setText(e.target.value)}
                  placeholder="#3b82f6"
                  className="font-mono"
                />
              </div>
            </Field>

            {!parsed ? (
              <Alert variant="error">
                Not a recognized CSS color. Try a hex like{" "}
                <span className="font-mono">#3b82f6</span>, a function like{" "}
                <span className="font-mono">rgb(59 130 246)</span>, or a name like{" "}
                <span className="font-mono">tomato</span>.
              </Alert>
            ) : null}
          </div>

          {/* Big preview swatch */}
          <div className="flex flex-col gap-1.5">
            <Label>Preview</Label>
            <div
              className="flex h-[7.5rem] items-end justify-between border-2 border-border p-3"
              style={{
                backgroundColor: parsed ? toRgbString(parsed) : "transparent",
                color: parsed ? readableText(parsed) : "var(--foreground)",
              }}
            >
              <span className="font-mono text-sm font-semibold">
                {parsed ? toHex(parsed) : "—"}
              </span>
              {parsed && parsed.a < 1 ? (
                <span className="font-mono text-xs opacity-80">
                  alpha {round(parsed.a, 2)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* ---- Conversions ---- */}
        {conv ? (
          <div className="space-y-3">
            <Label>Conversions</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ConvRow title="HEX" value={conv.hex} />
              {conv.hex8 ? <ConvRow title="HEX8 (with alpha)" value={conv.hex8} /> : null}
              <ConvRow title="RGB" value={conv.rgb} />
              <ConvRow title="HSL" value={conv.hsl} />
              <ConvRow title="OKLCH" value={conv.oklch} />
            </div>
          </div>
        ) : null}

        {/* ---- Tints & shades ---- */}
        {ramp ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Tints &amp; shades</Label>
              <span className="font-mono text-xs text-muted-foreground">
                click a swatch to copy
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
              {ramp.map((stop, i) => (
                <Swatch key={`${stop.hex}-${i}`} hex={stop.hex} label={stop.label} />
              ))}
            </div>
          </div>
        ) : null}

        {/* ---- WCAG contrast checker ---- */}
        <div className="space-y-4 border-t-2 border-border pt-6">
          <div className="space-y-1">
            <Label>WCAG contrast checker</Label>
            <p className="text-xs text-muted-foreground">
              Relative-luminance ratio per WCAG 2.x. Alpha is composited before
              measuring.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
            <div className="flex flex-col gap-4">
              <Field
                label="Foreground"
                htmlFor="fg-input"
                error={fg ? undefined : "Invalid color"}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Foreground picker"
                    value={fgPickerHex}
                    onChange={(e) => setFgText(e.target.value)}
                    className="h-9 w-14 shrink-0 border-2 border-border p-0"
                  />
                  <Input
                    id="fg-input"
                    value={fgText}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) => setFgText(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </Field>

              <Field
                label="Background"
                htmlFor="bg-input"
                error={bg ? undefined : "Invalid color"}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Background picker"
                    value={bgPickerHex}
                    onChange={(e) => setBgText(e.target.value)}
                    className="h-9 w-14 shrink-0 border-2 border-border p-0"
                  />
                  <Input
                    id="bg-input"
                    value={bgText}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) => setBgText(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </Field>

              {/* Live preview */}
              <div className="flex flex-col gap-1.5">
                <Label>Preview</Label>
                <div
                  aria-hidden="true"
                  className="space-y-1 border-2 border-border p-4"
                  style={{
                    backgroundColor: bg ? toRgbString(bg) : "var(--background)",
                    color: fg ? toRgbString(fg) : "var(--foreground)",
                  }}
                >
                  <p className="text-base font-semibold">Almost before we knew it,</p>
                  <p className="text-sm">
                    we had left the ground. The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
              </div>
            </div>

            {/* Ratio + pass/fail */}
            <div className="flex flex-col gap-3">
              <ResultPanel
                title="Contrast ratio"
                actions={
                  contrast ? (
                    <Badge variant="outline">
                      {contrast.aaNormal ? "AA OK" : contrast.aaLarge ? "AA Large" : "Low"}
                    </Badge>
                  ) : null
                }
                copyValue={contrast ? contrast.ratioStr : undefined}
              >
                <span className="font-mono text-3xl font-bold text-foreground">
                  {contrast ? contrast.ratioStr : "—"}
                </span>
              </ResultPanel>

              {contrast ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <PassBadge ok={contrast.aaNormal}>AA · normal (≥ 4.5)</PassBadge>
                  <PassBadge ok={contrast.aaLarge}>AA · large (≥ 3)</PassBadge>
                  <PassBadge ok={contrast.aaaNormal}>AAA · normal (≥ 7)</PassBadge>
                  <PassBadge ok={contrast.aaaLarge}>AAA · large (≥ 4.5)</PassBadge>
                </div>
              ) : (
                <Alert variant="info">
                  Enter valid foreground and background colors to compute a ratio.
                </Alert>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
