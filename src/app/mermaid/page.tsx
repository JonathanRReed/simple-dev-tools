import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import MermaidClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Mermaid Editor",
  description:
    "Write Mermaid diagrams with live preview, starter templates, and SVG or PNG export.",
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
