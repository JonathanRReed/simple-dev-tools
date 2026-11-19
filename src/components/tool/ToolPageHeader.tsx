import JsonLd from "@/components/JsonLd";
import PageHeader from "@/components/layout/PageHeader";
import { ToolTile } from "@/components/ToolIcon";
import { getToolPage } from "@/lib/site";
import { toolJsonLd } from "@/lib/structured-data";

type ToolPageHeaderProps = {
  /** The tool's route, as listed in `toolGroups` (e.g. "/tools/json/"). */
  href: string;
};

/**
 * Tool page header driven entirely by the catalog in `lib/site.ts`: the <h1>
 * and the one line under it are the same strings the sidebar, command palette
 * and structured data use, so they cannot drift apart. The icon tile carries
 * the tool's family hue, the same one it wears on the home rack.
 */
export default function ToolPageHeader({ href }: ToolPageHeaderProps) {
  const tool = getToolPage(href);
  if (!tool) {
    throw new Error(`ToolPageHeader: no catalog entry for "${href}" in lib/site.ts`);
  }
  return (
    <>
      <JsonLd data={toolJsonLd(tool)} />
      <PageHeader
        leading={<ToolTile icon={tool.icon} hue={tool.hue} className="size-10 sm:size-11" />}
        title={tool.title}
      >
        <p>{tool.description}</p>
      </PageHeader>
    </>
  );
}
