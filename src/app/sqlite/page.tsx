import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import SQLiteClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "SQLite Playground",
  description:
    "Run SQLite queries locally with WebAssembly, view result tables, and export CSV or JSON with no server.",
  alternates: {
    canonical: "/sqlite/",
  },
};

export default function SQLitePage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/sqlite/" />
      <SQLiteClientOnly />
      <ToolNotes>
        <ul>
          <li>
            This database only lives in memory for the current tab. Export CSV or JSON before
            closing it if you want to keep your results.
          </li>
          <li>
            The SQL.js WebAssembly file loads straight from this site with zero external requests.
          </li>
          <li>Statements run top to bottom. If one errors out, the batch stops right there.</li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/sqlite/" />
    </ToolPage>
  );
}
