import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import RegexClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Regex Lab",
  description:
    "Test JavaScript regular expressions with live matches, capture groups, replacements, and shareable links.",
  alternates: {
    canonical: "/tools/regex/",
  },
};

export default function RegexPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/tools/regex/" />
      <RegexClientOnly />
      <ToolNotes>
        <ul>
          <li>
            Patterns run on your browser&apos;s own JavaScript engine, so they match what{" "}
            <code>RegExp</code> does in your code.
          </li>
          <li>
            Matching runs in a web worker with a 1.5 second timeout, so a slow pattern errors out
            instead of freezing your tab.
          </li>
          <li>Replacement output caps out at 1,000,000 characters.</li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/regex/" />
    </ToolPage>
  );
}
