/**
 * The theme catalog. `scheme` says whether the palette is dark or light, which
 * the code editor needs for its own defaults. `id` is what gets stored in the
 * visitor's browser, so ids are permanent even when a label changes.
 */
export const appThemes = [
  {
    id: "art-deco",
    label: "Art Deco",
    scheme: "dark",
    swatches: ["#020508", "#e1bb62", "#88b0d8"],
  },
  {
    id: "blueprint",
    label: "Blueprint",
    scheme: "dark",
    swatches: ["#0f2a4d", "#f4f0e0", "#ffd166"],
  },
  {
    id: "main",
    label: "Rose Pine",
    scheme: "dark",
    swatches: ["#191724", "#c4a7e7", "#9ccfd8"],
  },
  {
    id: "moon",
    label: "Moon",
    scheme: "dark",
    swatches: ["#232136", "#c4a7e7", "#f6c177"],
  },
  {
    id: "raycast",
    label: "Graphite",
    scheme: "dark",
    swatches: ["#101010", "#ff6363", "#fefefe"],
  },
  {
    id: "paper",
    label: "Paper",
    scheme: "light",
    swatches: ["#f7f3ea", "#2f5d8c", "#b86f52"],
  },
  {
    id: "dawn",
    label: "Dawn",
    scheme: "light",
    swatches: ["#faf4ed", "#b4637a", "#286983"],
  },
  {
    id: "hi-vis",
    label: "Hi-Vis",
    scheme: "light",
    swatches: ["#f7d417", "#16130a", "#d9480f"],
  },
] as const;

export type AppThemeId = (typeof appThemes)[number]["id"];

export const appThemeIds = appThemes.map((theme) => theme.id);

export function getAppTheme(themeId: string | undefined) {
  return appThemes.find((theme) => theme.id === themeId);
}

/** True when the theme's surfaces are light. Unknown ids count as dark. */
export function isLightTheme(themeId: string | undefined): boolean {
  return getAppTheme(themeId)?.scheme === "light";
}

export const themeValues: Record<string, AppThemeId> = {
  ...Object.fromEntries(appThemeIds.map(id => [id, id])),
  dark: 'art-deco',
  light: 'paper',
};

export function resolveAppThemeId(theme: string | undefined, resolvedTheme: string | undefined): AppThemeId {
  const value = theme === 'system' ? resolvedTheme : theme ?? resolvedTheme;
  return themeValues[value ?? 'art-deco'] ?? 'art-deco';
}
