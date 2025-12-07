import dynamic from "next/dynamic";
import type { Metadata } from "next";

import ToolLoading from "@/components/ToolLoading";
import ToolPage from "@/components/layout/ToolPage";

export const metadata: Metadata = {
  title: "Mermaid Diagrams",
  description:
    "Edit Mermaid syntax, preview diagrams instantly, and export to SVG or PNG—all in your browser with zero setup.",
};

const MermaidClient = dynamic(() => import("./MermaidClient"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading Mermaid tool…" />
  ),
});

export default function MermaidPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Mermaid Diagrams
        </h1>
        <p className="text-muted-foreground">
          Edit Mermaid syntax, preview diagrams instantly, and export to SVG or PNG—all in your
          browser with zero setup.
        </p>
      </header>
      <MermaidClient />
    </ToolPage>
  );
}
