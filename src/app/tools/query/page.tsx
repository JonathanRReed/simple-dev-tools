import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import QueryClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Querystring Editor",
  description:
    "Break a query string, full URL, or form body into an editable table and copy the encoded result back.",
  alternates: {
    canonical: "/tools/query/",
  },
};

export default function QueryPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/tools/query/" />
      <QueryClientOnly />
      <ToolNotes>
        <ul>
          <li>
            Paste a full URL to pull out its query string. In Full URL mode, the origin and path
            become your editable base.
          </li>
          <li>
            Duplicate keys stay in order. Flip the spacing toggle to pick <code>+</code> like
            URLSearchParams or <code>%20</code> like encodeURIComponent.
          </li>
          <li>
            The <strong>Decoded</strong> and <strong>Raw</strong> toggle only changes how cells
            display. Raw values still decode when you edit them so the output stays valid.
          </li>
          <li>Your last input stays in this browser until you hit Reset.</li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/query/" />
    </ToolPage>
  );
}
