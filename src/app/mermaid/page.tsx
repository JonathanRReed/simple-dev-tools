import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import MermaidClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Mermaid Editor",
  description:
    "Use a browser-only Mermaid diagram generator to edit Mermaid syntax, preview diagrams instantly, start from templates, and export SVG or PNG files.",
  alternates: {
    canonical: "/mermaid/",
  },
};

export default function MermaidPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/mermaid/" />
      <MermaidClientOnly />
      <FamilyTools href="/mermaid/" />
    </ToolPage>
  );
}
