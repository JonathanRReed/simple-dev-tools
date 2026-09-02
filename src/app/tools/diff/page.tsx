import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import DiffClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Text Diff",
  description:
    "Compare two texts side by side or unified, with word- or line-level highlighting. Everything runs locally in your browser, and nothing is uploaded.",
  alternates: {
    canonical: "/tools/diff/",
  },
};

export default function DiffPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Text Diff
        </h1>
        <p className="text-muted-foreground">
          Paste two versions of a text and see the difference instantly. Switch
          between side-by-side and unified views, highlight words or whole lines,
          and copy or download the patch.
        </p>
        <p className="text-muted-foreground">
          Every byte stays on this page. Diffing, rendering, and exports all run
          client-side.
        </p>
      </header>
      <DiffClientOnly />
      <section className="border-2 border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="brutal-label mb-2 text-foreground">Notes</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Word-level diff highlights individual changed words; line-level diff treats each line as a unit.
          </li>
          <li>
            Ignore whitespace and ignore case options normalize comparison without changing the original text.
          </li>
          <li>
            Use <kbd className="font-mono">⌘ ↵</kbd> or <kbd className="font-mono">Ctrl ↵</kbd> to recompute.
          </li>
        </ul>
      </section>
    </ToolPage>
  );
}
