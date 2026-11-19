import { ToolTile } from "@/components/ToolIcon";
import type { ToolMeta } from "@/lib/site";

/**
 * A compact link to a tool: its family tile and its name on a keycap. The
 * one-line description is the native tooltip rather than visible text.
 */
export default function ToolChip({ tool }: { tool: ToolMeta }) {
  return (
    <a
      href={tool.href}
      title={tool.description}
      className="key flex h-full items-center gap-3 rounded-lg p-2.5 text-secondary-foreground"
    >
      <ToolTile icon={tool.icon} hue={tool.hue} className="bg-background" />
      <span className="text-sm font-semibold">{tool.title}</span>
    </a>
  );
}
