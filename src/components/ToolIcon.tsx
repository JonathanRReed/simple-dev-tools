import {
  Braces,
  CalendarClock,
  Clock,
  Code2,
  Database,
  FileDiff,
  FileJson,
  FileText,
  Hash,
  Palette,
  QrCode,
  SearchCode,
  ShieldCheck,
  Table,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import type { ToolHue, ToolIcon } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The single ToolIcon → lucide mapping. A new icon only needs to be added here
 * (and to the ToolIcon union in site.ts).
 */
const iconMap = {
  braces: Braces,
  calendarClock: CalendarClock,
  clock: Clock,
  code: Code2,
  color: Palette,
  database: Database,
  diff: FileDiff,
  hash: Hash,
  json: FileJson,
  markdown: FileText,
  qr: QrCode,
  searchCode: SearchCode,
  shield: ShieldCheck,
  table: Table,
  workflow: Workflow,
} satisfies Record<ToolIcon, LucideIcon>;

export function getToolIcon(icon: ToolIcon): LucideIcon {
  return iconMap[icon];
}

/** Static class names per family, so Tailwind can see every one of them. */
const hueTile: Record<ToolHue, string> = {
  web: "bg-hue-web/15 text-hue-web",
  data: "bg-hue-data/15 text-hue-data",
  text: "bg-hue-text/15 text-hue-text",
  time: "bg-hue-time/15 text-hue-time",
  security: "bg-hue-security/15 text-hue-security",
  visual: "bg-hue-visual/15 text-hue-visual",
};

const hueText: Record<ToolHue, string> = {
  web: "text-hue-web",
  data: "text-hue-data",
  text: "text-hue-text",
  time: "text-hue-time",
  security: "text-hue-security",
  visual: "text-hue-visual",
};

const hueDot: Record<ToolHue, string> = {
  web: "bg-hue-web",
  data: "bg-hue-data",
  text: "bg-hue-text",
  time: "bg-hue-time",
  security: "bg-hue-security",
  visual: "bg-hue-visual",
};

export function hueTextClass(hue: ToolHue): string {
  return hueText[hue];
}

/** Solid fill in a family's hue, for legend dots. */
export function hueDotClass(hue: ToolHue): string {
  return hueDot[hue];
}

type ToolTileProps = {
  icon: ToolIcon;
  hue: ToolHue;
  className?: string;
};

/** A tool's icon on a tile tinted with its family hue. */
export function ToolTile({ icon, hue, className }: ToolTileProps) {
  const Icon = iconMap[icon];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg]:size-[1.15rem]",
        hueTile[hue],
        className
      )}
    >
      <Icon strokeWidth={2.1} />
    </span>
  );
}
