import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
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
      <ToolPageHeader href="/tools/query/">
        <p>
          Paste a URL query string, a full URL, or an application/x-www-form-urlencoded body. Edit
          parameters in a table, toggle between + and %20 spacing, and copy the re-encoded result.
        </p>
        <p>Everything is parsed locally in your browser. Your last source input is remembered.</p>
      </ToolPageHeader>
      <QueryClientOnly />
      <ToolNotes>
        <ul>
          <li>
            Pasting a full URL extracts the query string and, in Full URL mode, uses the
            URL&apos;s origin and path as the editable base.
          </li>
          <li>
            Duplicate keys are preserved and ordered as they appear. Use the spacing toggle to
            choose <code>+</code> (URLSearchParams style) or <code>%20</code> (encodeURIComponent
            style) for spaces.
          </li>
          <li>
            The <strong>Decoded</strong>/<strong>Raw</strong> value toggle only changes how table
            cells are displayed; raw cells are decoded on every edit so the output stays valid.
          </li>
        </ul>
      </ToolNotes>
    </ToolPage>
  );
}
