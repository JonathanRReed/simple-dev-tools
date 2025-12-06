import dynamic from "next/dynamic";
import type { Metadata } from "next";

import ToolLoading from "@/components/ToolLoading";
import ToolPage from "@/components/layout/ToolPage";

export const metadata: Metadata = {
  title: "API Snippet Generator",
};

const ApiSnippetClient = dynamic(() => import("./Client"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading API Snippet Generator…" />
  ),
});

export default function ApiSnippetPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          API Snippet Generator
        </h1>
        <p className="text-muted-foreground">
          Generate copy-paste-ready cURL, Python requests, and fetch snippets from a single
          endpoint definition. Works client-side—no API keys required.
        </p>
      </header>
      <ApiSnippetClient />
    </ToolPage>
  );
}
