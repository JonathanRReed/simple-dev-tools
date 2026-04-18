import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import RegexClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Regex Lab",
  description:
    "Test, visualize, and share regular expressions with live matches, replacements, and shareable URLs. Everything runs client-side.",
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
      </header>
      <RegexClientOnly />
    </ToolPage>
  );
}
