import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
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
      <ToolPageHeader href="/tools/regex/">
        <p>
          Test, visualize, and share regular expressions with live matches, replacements, and
          shareable URLs. Everything runs client-side.
        </p>
        <p className="text-sm">
          Use Regex Lab when you need to debug a pattern before it goes into an API route,
          validation rule, parser, log filter, or data cleanup script. Live matches make it
          easier to catch greedy groups, missing anchors, accidental case sensitivity, and
          replacement output that looks correct until it touches real text.
        </p>
      </ToolPageHeader>
      <RegexClientOnly />
      <ToolNotes title="Practical regex debugging">
        <p>
          A useful regular expression helper should make the input, pattern, matches, and
          replacement result visible at the same time. That is the fastest way to see whether a
          pattern is matching the intended text or only passing on a small happy-path sample.
        </p>
        <p>
          The tool is built for short implementation checks: validating a slug, extracting IDs
          from logs, cleaning copied data, checking a route matcher, or confirming a replacement
          before it is moved into code. Because the workspace runs in the browser, sample text
          and patterns do not need to be sent to a remote formatter.
        </p>
      </ToolNotes>
    </ToolPage>
  );
}
