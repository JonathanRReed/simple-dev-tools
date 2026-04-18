export const appThemes = [
  {
    id: "art-deco",
    label: "Art Deco",
    description: "Noir, ivory, and gold",
    swatches: ["#020508", "#e1bb62", "#88b0d8"],
  },
  {
    id: "main",
    label: "Rose Pine",
    description: "Rich midnight workbench",
    swatches: ["#191724", "#c4a7e7", "#9ccfd8"],
  },
  {
    id: "moon",
    label: "Moon",
    description: "High-contrast twilight",
    swatches: ["#232136", "#c4a7e7", "#f6c177"],
  },
  {
    id: "dawn",
    label: "Dawn",
    description: "Soft daylight mode",
    swatches: ["#faf4ed", "#b4637a", "#286983"],
  },
  {
    id: "raycast",
    label: "Raycast",
    description: "Graphite, red, and white",
    swatches: ["#101010", "#ff6363", "#fefefe"],
  },
  {
    id: "paper",
    label: "Paper",
    description: "Clean light workbench",
    swatches: ["#f7f3ea", "#2f5d8c", "#b86f52"],
  },
] as const;

export type AppThemeId = (typeof appThemes)[number]["id"];

export const appThemeIds = appThemes.map((theme) => theme.id);

export function getAppTheme(themeId: string | undefined) {
  return appThemes.find((theme) => theme.id === themeId);
}
