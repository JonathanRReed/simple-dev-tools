import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import RegexClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Regex Debugger and Tester",
  description:
    "Debug regular expressions with live matches, replacements, sample text, and shareable URLs. This browser regex tester runs client-side.",
  alternates: {
    canonical: "/tools/regex/",
  },
};

export default function RegexPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Regex Lab
        </h1>
        <p className="text-muted-foreground">
          This regex tester is created by Jonathan R Reed to make quick pattern checks less painful.
          Test, visualize, and share regular expressions with live matches, replacements, and shareable URLs.
          Everything runs client-side.
        </p>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          Use Regex Lab when you need to debug a pattern before it goes into an
          API route, validation rule, parser, log filter, or data cleanup script.
          Live matches make it easier to catch greedy groups, missing anchors,
          accidental case sensitivity, and replacement output that looks correct
          until it touches real text.
        </p>
      </header>
      <RegexClientOnly />
      <section className="rounded-xl border border-border/60 bg-card/50 p-5 text-sm leading-7 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">
          Practical regex debugging
        </h2>
        <p className="mt-3">
          A useful regular expression helper should make the input, pattern,
          matches, and replacement result visible at the same time. That is the
          fastest way to see whether a pattern is matching the intended text or
          only passing on a small happy-path sample.
        </p>
        <p className="mt-3">
          The tool is built for short implementation checks: validating a slug,
          extracting IDs from logs, cleaning copied data, checking a route
          matcher, or confirming a replacement before it is moved into code.
          Because the workspace runs in the browser, sample text and patterns do
          not need to be sent to a remote formatter.
        </p>
      </section>
    </ToolPage>
  );
}
