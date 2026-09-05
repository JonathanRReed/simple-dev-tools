import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
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
      <ToolPageHeader href="/tools/json/">
        <p>
          Paste JSON, YAML, or CSV and validate it on the spot. Format, minify, or sort keys, then
          convert between all three formats and query nested values by path.
        </p>
        <p>
          Every byte stays on this page. Parsing, conversion, and queries all run client-side, so
          nothing is ever uploaded.
        </p>
      </ToolPageHeader>
      <JsonClientOnly />
      <ToolNotes>
        <ul>
          <li>
            CSV parsing follows RFC 4180: quoted fields, embedded commas and newlines, and{" "}
            <code>&quot;&quot;</code> escaped quotes.
          </li>
          <li>
            Converting to CSV requires an array of objects; the header is the union of keys in
            first-seen order.
          </li>
          <li>
            Path queries accept dotted keys and bracket access, e.g. <code>users[0].name</code> or{" "}
            <code>[&quot;weird key&quot;].value</code>.
          </li>
        </ul>
      </ToolNotes>
    </ToolPage>
  );
}
