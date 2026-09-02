import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import MarkdownClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Markdown Preview",
  description:
    "Paste Markdown and see a clean, sanitized rendered preview. Copy the sanitized HTML or download a standalone document. Everything runs in your browser.",
  alternates: {
    canonical: "/tools/markdown/",
  },
};

export default function MarkdownPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Markdown Preview
        </h1>
        <p className="text-muted-foreground">
          Type or paste Markdown on the left and get a live, DOMPurify-sanitized
          preview on the right. Copy the HTML or download a complete page.
        </p>
        <p className="text-muted-foreground">
          Parsing and sanitization happen entirely in your browser. Nothing is
          uploaded.
        </p>
      </header>
      <MarkdownClientOnly />
      <section className="border-2 border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="brutal-label mb-2 text-foreground">Notes</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Raw HTML in Markdown is parsed by{" "}
            <code className="font-mono">marked</code> and then filtered by
            DOMPurify before rendering.
          </li>
          <li>
            The preview updates after a 200 ms debounce and is rendered
            client-side only.
          </li>
          <li>
            Use{" "}
            <kbd className="font-mono border border-border px-1">⌘ ↵</kbd> while
            editing to copy the sanitized HTML.
          </li>
        </ul>
      </section>
    </ToolPage>
  );
}
