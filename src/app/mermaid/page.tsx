import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import MermaidClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Mermaid Diagrams",
  description:
    "Edit Mermaid syntax, preview diagrams instantly, start from common templates, and export SVG or PNG files from a browser-only workspace.",
  alternates: {
    canonical: "/mermaid/",
  },
};

export default function MermaidPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Mermaid Diagrams
        </h1>
        <p className="text-muted-foreground">
          Edit Mermaid syntax, preview diagrams instantly, and export to SVG or PNG in your
          browser with zero setup.
        </p>
      </header>
      <MermaidClientOnly />
    </ToolPage>
  );
}
