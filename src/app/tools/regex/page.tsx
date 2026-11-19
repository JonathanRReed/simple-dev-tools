import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import RegexClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Regex Lab Browser Regex Tester",
  description:
    "Debug regular expressions with live matches, replacements, sample text, and shareable URLs. This browser regex tester runs client-side.",
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
            Patterns use your browser&apos;s JavaScript regular expression engine, so results
            match what <code>RegExp</code> does in your own code.
          </li>
          <li>
            Matching runs in a background worker and stops after 1.5 seconds. A runaway pattern
            reports an error instead of freezing the page.
          </li>
          <li>Replacement output is capped at 1,000,000 characters.</li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/regex/" />
    </ToolPage>
  );
}
