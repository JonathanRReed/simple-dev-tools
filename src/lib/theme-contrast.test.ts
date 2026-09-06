import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Palette guard. Every theme in globals.css is checked against WCAG 2.2:
 * 1.4.3 (4.5:1 for normal text) and 1.4.11 (3:1 for the boundary of a UI
 * component). The brutalist language leans entirely on 2px borders, so a
 * border that drops below 3:1 is both an accessibility failure and a visual
 * one — this test is what keeps a palette tweak from quietly undoing that.
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

/** The Rosé Pine-derived raw palette is stored as hex. */
function palette(block: string, name: string): Rgb {
  return hexToRgb(token(block, name));
}

const THEMES = ["art-deco", "main", "moon", "dawn", "raycast", "paper"] as const;

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
      const surface = palette(block, "rp-surface");

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
      ];

      for (const [label, fg, on] of textPairs) {
        test(`text: ${label}`, () => {
          expect(contrast(fg, on)).toBeGreaterThanOrEqual(TEXT_MIN);
        });
      }

      // 1.4.11 — the 2px border is how every card, input, tab and button is
      // identified, so it must clear 3:1 on every surface it can land on.
      const uiPairs: [string, Rgb, Rgb][] = [
        ["border on background", semantic(block, "border"), bg],
        ["border on card", semantic(block, "border"), card],
        ["border on popover", semantic(block, "border"), popover],
        ["input border on background", semantic(block, "input"), bg],
        ["input border on card", semantic(block, "input"), card],
        ["sidebar-border on sidebar", semantic(block, "sidebar-border"), sidebarBg],
        // globals.css styles native input/select/textarea with this pair.
        ["native field border on field surface", palette(block, "rp-highlight-high"), surface],
        ["focus ring on background", palette(block, "rp-iris"), bg],
        ["focus ring on card", palette(block, "rp-iris"), card],
      ];

      for (const [label, fg, on] of uiPairs) {
        test(`ui: ${label}`, () => {
          expect(contrast(fg, on)).toBeGreaterThanOrEqual(UI_MIN);
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
