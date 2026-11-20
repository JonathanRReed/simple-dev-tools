import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import JsonClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "JSON Workbench",
  description:
    "Format, validate, and convert between JSON, YAML, and CSV, or query nested values by path.",
  alternates: {
    canonical: "/tools/json/",
  },
};

export default function JsonPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/tools/json/" />
      <JsonClientOnly />
      <ToolNotes>
        <ul>
          <li>
            CSV parsing follows RFC 4180, so quoted fields, commas or newlines inside quotes, and{" "}
            <code>&quot;&quot;</code> escaped quotes all work.
          </li>
          <li>
            Exporting to CSV needs an array of objects. Columns are built from every key in the
            order they first appear.
          </li>
          <li>
            Path queries handle dots and brackets, like <code>users[0].name</code> or{" "}
            <code>[&quot;weird key&quot;].value</code>.
          </li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/json/" />
    </ToolPage>
  );
}
