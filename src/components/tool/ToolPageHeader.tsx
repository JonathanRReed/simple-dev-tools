import type { ReactNode } from "react";

import PageHeader from "@/components/layout/PageHeader";
import { getToolPage, toolPages } from "@/lib/site";

type ToolPageHeaderProps = {
  /** The tool's route, as listed in `toolGroups` (e.g. "/tools/json/"). */
  href: string;
  /** Lede paragraphs. */
  children?: ReactNode;
};

/**
 * Tool page header driven by the catalog in `lib/site.ts`, so the <h1> is the
 * same string the sidebar, command palette, and JSON-LD use. The eyebrow
 * carries the tool's catalog index (matching the 1–9 home shortcuts) and tags.
 */
export default function ToolPageHeader({ href, children }: ToolPageHeaderProps) {
  const tool = getToolPage(href);
  if (!tool) {
    throw new Error(`ToolPageHeader: no catalog entry for "${href}" in lib/site.ts`);
  }
  const index = toolPages.indexOf(tool) + 1;
  const eyebrow = [
    `${String(index).padStart(2, "0")} / ${toolPages.length}`,
    ...tool.tags,
  ].join(" · ");
  return (
    <PageHeader eyebrow={eyebrow} title={tool.title}>
      {children}
    </PageHeader>
  );
}
