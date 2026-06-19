import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import JsonClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "JSON Workbench",
  description:
    "Format, validate, and convert between JSON, YAML, and CSV, then query by path. Everything runs locally in your browser, and nothing is uploaded.",
  alternates: {
    canonical: "/tools/json/",
  },
};

export default function JsonPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          JSON Workbench
        </h1>
        <p className="text-muted-foreground">
          Paste JSON, YAML, or CSV and validate it on the spot. Format, minify, or
          sort keys, then convert between all three formats and query nested values
          by path.
        </p>
        <p className="text-muted-foreground">
          Every byte stays on this page. Parsing, conversion, and queries all run
          client-side, so nothing is ever uploaded.
        </p>
      </header>
      <JsonClientOnly />
      <section className="border-2 border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="brutal-label mb-2 text-foreground">Notes</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            CSV parsing follows RFC 4180: quoted fields, embedded commas and
            newlines, and <code className="font-mono">&quot;&quot;</code> escaped quotes.
          </li>
          <li>
            Converting to CSV requires an array of objects; the header is the union
            of keys in first-seen order.
          </li>
          <li>
            Path queries accept dotted keys and bracket access, e.g.{" "}
            <code className="font-mono">users[0].name</code> or{" "}
            <code className="font-mono">[&quot;weird key&quot;].value</code>.
          </li>
        </ul>
      </section>
    </ToolPage>
  );
}
