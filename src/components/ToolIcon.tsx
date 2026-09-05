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

import type { ToolIcon } from "@/lib/site";

/**
 * The single ToolIcon → lucide mapping. Previously duplicated in Sidebar,
 * CommandMenu, and the home page; a new icon now only needs to be added here
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
