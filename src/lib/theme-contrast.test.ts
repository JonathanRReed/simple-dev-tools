import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Palette guard. Every theme in globals.css is checked against WCAG 2.2:
 * 1.4.3 (4.5:1 for normal text) and 1.4.11 (3:1 for the boundary of a control
 * and for meaningful graphics).
 *
 * Two kinds of line exist in the design. `--input` is the boundary of a
 * control (a field, a switch) and owes 3:1 on every surface it can land on.
 * The hairline between regions (`--line`, Tailwind's `border`) is decorative:
 * it separates things that are already distinguishable, so it is derived from
 * the ink color and deliberately not held to a ratio. Anything a person must
 * be able to find therefore has to use `border-input`, never the hairline.
 */

const CSS = readFileSync(join(import.meta.dir, "../app/globals.css"), "utf8");

type Rgb = [number, number, number];

function hslToRgb(h: number, s: number, l: number): Rgb {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1]: Rgb =
    hp < 1 ? [c, x, 0]
    : hp < 2 ? [x, c, 0]
    : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c]
    : hp < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = ln - c / 2;
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

function hexToRgb(hex: string): Rgb {
  const v = hex.replace("#", "");
  const full = v.length === 3 ? v.split("").map((ch) => ch + ch).join("") : v;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (raw: number) => {
    const v = raw / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Pull one `:root[data-theme="…"] { … }` block out of globals.css. */
function themeBlock(theme: string): string {
  const match = CSS.match(
    new RegExp(`:root\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`)
  );
  if (!match) throw new Error(`No theme block for "${theme}" in globals.css`);
  return match[1];
}

function token(block: string, name: string): string {
  const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`Missing --${name}`);
  return match[1].trim();
}

/** Semantic tokens are stored as bare "H S% L%" triplets for hsl(). */
function semantic(block: string, name: string): Rgb {
  const raw = token(block, name);
  const m = raw.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) throw new Error(`--${name} is not an HSL triplet: "${raw}"`);
  return hslToRgb(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** The raw palette is stored as hex. */
function palette(block: string, name: string): Rgb {
  return hexToRgb(token(block, name));
}

/** A hex token that only some themes define. */
function optionalPalette(block: string, name: string): Rgb | null {
  const match = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8});`));
  return match ? hexToRgb(match[1]) : null;
}

const THEMES = [
  "art-deco", "blueprint", "main", "moon", "raycast", "paper", "dawn", "hi-vis",
] as const;

/** Indicator LED colors, by scheme (see the `--led` declarations). */
const LED_DARK = hexToRgb("#5ddc92");
const LED_LIGHT: Record<string, Rgb> = {
  dawn: hexToRgb("#14804a"),
  paper: hexToRgb("#14804a"),
  "hi-vis": hexToRgb("#0f6b3d"),
};

const TEXT_MIN = 4.5;
const UI_MIN = 3;

describe("theme palettes meet WCAG contrast", () => {
  for (const theme of THEMES) {
    describe(theme, () => {
      const block = themeBlock(theme);
      const bg = semantic(block, "background");
      const card = semantic(block, "card");
      const popover = semantic(block, "popover");
      const sidebarBg = semantic(block, "sidebar-background");
      // The page itself. Most themes use the well color; a theme may override.
      const bench = optionalPalette(block, "bench") ?? palette(block, "rp-base");

      const textPairs: [string, Rgb, Rgb][] = [
        ["foreground on background", semantic(block, "foreground"), bg],
        ["muted-foreground on background", semantic(block, "muted-foreground"), bg],
        ["muted-foreground on card", semantic(block, "muted-foreground"), card],
        ["card-foreground on card", semantic(block, "card-foreground"), card],
        ["popover-foreground on popover", semantic(block, "popover-foreground"), popover],
        ["primary-foreground on primary", semantic(block, "primary-foreground"), semantic(block, "primary")],
        ["secondary-foreground on secondary", semantic(block, "secondary-foreground"), semantic(block, "secondary")],
        ["accent-foreground on accent", semantic(block, "accent-foreground"), semantic(block, "accent")],
        ["destructive-foreground on destructive", semantic(block, "destructive-foreground"), semantic(block, "destructive")],
        ["sidebar-foreground on sidebar", semantic(block, "sidebar-foreground"), sidebarBg],
        ["sidebar-primary-foreground on sidebar-primary", semantic(block, "sidebar-primary-foreground"), semantic(block, "sidebar-primary")],
        ["sidebar-accent-foreground on sidebar-accent", semantic(block, "sidebar-accent-foreground"), semantic(block, "sidebar-accent")],
        // Headings, ledes and the footer sit straight on the bench.
        ["foreground on bench", semantic(block, "foreground"), bench],
        ["muted-foreground on bench", semantic(block, "muted-foreground"), bench],
        // Readouts and empty states sit in wells and popovers.
        ["muted-foreground on well", semantic(block, "muted-foreground"), palette(block, "rp-base")],
        ["muted-foreground on popover", semantic(block, "muted-foreground"), popover],
      ];

      for (const [label, fg, on] of textPairs) {
        test(`text: ${label}`, () => {
          expect(contrast(fg, on)).toBeGreaterThanOrEqual(TEXT_MIN);
        });
      }

      // 1.4.11 — a control's boundary is how it is found, so it must clear
      // 3:1 on every surface a control can land on. globals.css styles native
      // input/select/textarea with --input on the well color.
      const led = LED_LIGHT[theme] ?? LED_DARK;
      const uiPairs: [string, Rgb, Rgb][] = [
        ["input border on background", semantic(block, "input"), bg],
        ["input border on card", semantic(block, "input"), card],
        ["input border on well", semantic(block, "input"), palette(block, "rp-base")],
        ["focus ring on background", palette(block, "rp-iris"), bg],
        ["focus ring on card", palette(block, "rp-iris"), card],
        ["focus ring on bench", palette(block, "rp-iris"), bench],
        ["focus ring on sidebar", palette(block, "rp-iris"), sidebarBg],
        // The lit bar under the selected tab and beside the current page.
        ["primary indicator on card", semantic(block, "primary"), card],
        ["primary indicator on well", semantic(block, "primary"), palette(block, "rp-base")],
        ["primary indicator on sidebar-accent", semantic(block, "primary"), semantic(block, "sidebar-accent")],
        // The "runs locally" LED.
        ["LED on card", led, card],
        ["LED on bench", led, bench],
      ];

      for (const [label, fg, on] of uiPairs) {
        test(`ui: ${label}`, () => {
          expect(contrast(fg, on)).toBeGreaterThanOrEqual(UI_MIN);
        });
      }

      // Syntax tokens are code — normal text — so they owe the full 4.5:1.
      // They also color the six tool families, so they are checked on every
      // surface either use can land on: the page background, a card, the raw
      // --rp-base well, and the bench. Measuring only one of them is how two
      // tokens previously slipped through at 4.47.
      const CODE_SURFACES: [string, Rgb][] = [
        ["background", bg],
        ["card", card],
        ["rp-base", palette(block, "rp-base")],
        ["bench", bench],
      ];
      const CODE_TOKENS = [
        "comment", "punctuation", "keyword", "string",
        "number", "operator", "function", "tag",
      ];

      for (const name of CODE_TOKENS) {
        test(`code: --code-${name}`, () => {
          const color = palette(block, `code-${name}`);
          for (const [surface, on] of CODE_SURFACES) {
            const ratio = contrast(color, on);
            if (ratio < TEXT_MIN) {
              throw new Error(
                `--code-${name} is ${ratio.toFixed(2)}:1 on ${surface} (needs ${TEXT_MIN})`
              );
            }
            expect(ratio).toBeGreaterThanOrEqual(TEXT_MIN);
          }
        });
      }
    });
  }
});

test("every theme declared in themes.ts has a palette block", async () => {
  const { appThemeIds } = await import("./themes");
  for (const id of appThemeIds) {
    expect(() => themeBlock(id)).not.toThrow();
  }
  expect([...appThemeIds].sort()).toEqual([...THEMES].sort());
});
