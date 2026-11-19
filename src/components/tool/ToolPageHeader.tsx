import type { ReactNode } from "react";

import PageHeader from "@/components/layout/PageHeader";
import { ToolTile } from "@/components/ToolIcon";
import { getToolPage } from "@/lib/site";

type ToolPageHeaderProps = {
  /** The tool's route, as listed in `toolGroups` (e.g. "/tools/json/"). */
  href: string;
  /** Lede paragraphs. */
  children?: ReactNode;
};

/**
 * Tool page header driven by the catalog in `lib/site.ts`, so the <h1> is the
 * same string the sidebar, command palette, and JSON-LD use. The icon tile
 * carries the tool's family hue, the same one it wears on the home rack.
 */
export default function ToolPageHeader({ href, children }: ToolPageHeaderProps) {
  const tool = getToolPage(href);
  if (!tool) {
    throw new Error(`ToolPageHeader: no catalog entry for "${href}" in lib/site.ts`);
  }
  return (
    <PageHeader
      leading={<ToolTile icon={tool.icon} hue={tool.hue} className="size-10 sm:size-11" />}
      title={tool.title}
    >
      {children}
    </PageHeader>
  );
}
