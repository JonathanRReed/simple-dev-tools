import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import QueryClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Querystring Editor",
  description:
    "Paste a query string, full URL, or form body, edit its parameters as a table, and copy the re-encoded result.",
  alternates: {
    canonical: "/tools/query/",
  },
};

export default function QueryPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Querystring Editor
        </h1>
        <p className="text-muted-foreground">
          Paste a URL query string, a full URL, or an application/x-www-form-urlencoded body.
          Edit parameters in a table, toggle between + and %20 spacing, and copy the re-encoded result.
        </p>
        <p className="text-muted-foreground">
          Everything is parsed locally in your browser. Your last source input is remembered.
        </p>
      </header>
      <QueryClientOnly />
      <section className="border-2 border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="brutal-label mb-2 text-foreground">Notes</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Pasting a full URL extracts the query string and, in Full URL mode, uses the
            URL&apos;s origin and path as the editable base.
          </li>
          <li>
            Duplicate keys are preserved and ordered as they appear. Use the spacing toggle to
            choose <code className="font-mono">+</code> (URLSearchParams style) or{" "}
            <code className="font-mono">%20</code> (encodeURIComponent style) for spaces.
          </li>
          <li>
            The <strong>Decoded</strong>/<strong>Raw</strong> value toggle only changes how table
            cells are displayed; raw cells are decoded on every edit so the output stays valid.
          </li>
        </ul>
      </section>
    </ToolPage>
  );
}
