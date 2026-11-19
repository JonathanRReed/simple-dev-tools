import ToolChip from "@/components/tool/ToolChip";
import { getToolPage, toolCatalog } from "@/lib/site";

type FamilyToolsProps = {
  /** The current tool's route, as listed in `toolGroups`. */
  href: string;
};

/**
 * The other tools in the same family, at the foot of a tool page. Someone
 * formatting JSON is often one step from needing a schema or a SQL table, so
 * the next tool should be one click away rather than a trip back home.
 */
export default function FamilyTools({ href }: FamilyToolsProps) {
  const current = getToolPage(href);
  if (!current) return null;
  const siblings = toolCatalog.filter(
    (tool) => tool.family === current.family && tool.href !== current.href
  );
  if (siblings.length === 0) return null;
  return (
    <nav aria-label={`More ${current.family} tools`} className="border-t border-border px-1 pt-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">More in {current.family}</h2>
      <ul className="flex flex-wrap gap-3">
        {siblings.map((tool) => (
          <li key={tool.href}>
            <ToolChip tool={tool} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
