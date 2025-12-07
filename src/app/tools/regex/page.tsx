import dynamic from "next/dynamic";
import type { Metadata } from "next";

import ToolLoading from "@/components/ToolLoading";
import ToolPage from "@/components/layout/ToolPage";

export const metadata: Metadata = {
  title: "Regex Lab",
  description:
    "Test, visualize, and share regular expressions with live matches, replacements, and shareable URLs. Everything runs client-side.",
};

const RegexClient = dynamic(() => import("./Client"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading Regex Lab…" />
  ),
});

export default function RegexPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Regex Lab
        </h1>
        <p className="text-muted-foreground">
          Test, visualize, and share regular expressions with live matches, replacements, and shareable URLs.
          Everything runs client-side.
        </p>
      </header>
      <RegexClient />
    </ToolPage>
  );
}
