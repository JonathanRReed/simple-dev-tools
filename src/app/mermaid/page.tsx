import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import MermaidClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Mermaid Diagram Generator",
  description:
    "Use a browser-only Mermaid diagram generator to edit Mermaid syntax, preview diagrams instantly, start from templates, and export SVG or PNG files.",
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
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          The editor is intended for architecture sketches, sequence diagrams,
          onboarding notes, and quick planning artifacts. Start from a template,
          adjust the Mermaid source, validate the rendered diagram, then export a
          shareable asset for docs, tickets, or implementation reviews.
        </p>
      </header>
      <MermaidClientOnly />
      <section className="rounded-xl border border-border/60 bg-card/50 p-5 text-sm leading-7 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">
          When this Mermaid generator helps
        </h2>
        <p className="mt-3">
          Mermaid is useful when a team needs diagrams that can live beside code.
          A flowchart can explain a product path, a sequence diagram can document
          an integration, and a class or entity diagram can make a data model
          easier to review before implementation begins.
        </p>
        <p className="mt-3">
          This workspace keeps the loop short. Paste or write Mermaid syntax,
          check the preview, adjust labels, then export an asset for a pull
          request, design note, project brief, or operations runbook. The diagram
          text stays in the browser while you work.
        </p>
        <p className="mt-3">
          The templates are intentionally plain so they can be adapted quickly.
          They are starting points for architecture sketches, handoff diagrams,
          onboarding maps, and planning documents where clarity matters more than
          decoration.
        </p>
      </section>
    </ToolPage>
  );
}
