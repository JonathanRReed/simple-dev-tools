import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import SQLiteClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "SQLite Playground",
  description:
    "Run SQL experiments locally in your browser using SQLite WASM. Edit queries, execute, and inspect results without any backend.",
  alternates: {
    canonical: "/sqlite/",
  },
};

export default function SQLitePage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/sqlite/">
        <p>
          Run SQL experiments locally in your browser using SQLite WASM. Edit queries, execute,
          and inspect results without any backend.
        </p>
      </ToolPageHeader>
      <SQLiteClientOnly />
      <ToolNotes>
        <ul>
          <li>
            The database is in-memory and lives only for this tab. Export results as CSV or JSON
            before you close it.
          </li>
          <li>
            The SQL.js WebAssembly runtime is served from this site&apos;s own origin; no
            third-party request is made.
          </li>
          <li>Statements run in order; a failing statement stops the batch and reports its error.</li>
        </ul>
      </ToolNotes>
    </ToolPage>
  );
}
