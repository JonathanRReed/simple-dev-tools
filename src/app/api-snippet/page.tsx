import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ApiSnippetClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "API Snippet Generator",
  description:
    "Generate copy-paste-ready cURL, Python requests, and fetch snippets from a single endpoint definition. Works client-side, no API keys required.",
  alternates: {
    canonical: "/api-snippet/",
  },
};

export default function ApiSnippetPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          API Snippet Generator
        </h1>
        <p className="text-muted-foreground">
          Generate copy-paste-ready cURL, Python requests, and fetch snippets from a single
          endpoint definition. Works client-side, no API keys required.
        </p>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          Use it when you need quick request examples for documentation, QA notes,
          API handoffs, or local debugging. Enter the method, URL, headers, body,
          and authentication shape once, then compare generated snippets without
          pasting private credentials into a hosted formatter.
        </p>
      </header>
      <ApiSnippetClientOnly />
      <section className="rounded-xl border border-border/60 bg-card/50 p-5 text-sm leading-7 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">
          Why generate snippets in one place
        </h2>
        <p className="mt-3">
          API examples often drift when every language sample is edited by hand.
          This generator keeps the method, endpoint, headers, query parameters,
          and request body in one form, then turns that shared definition into
          cURL, fetch, and Python requests examples.
        </p>
        <p className="mt-3">
          That makes it useful for debugging a new endpoint, writing quick
          documentation, preparing QA notes, or sharing an integration example
          with another developer. The generated snippets are meant to be copied,
          reviewed, and adjusted before they are committed to a production code
          path.
        </p>
      </section>
    </ToolPage>
  );
}
