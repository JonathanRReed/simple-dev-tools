import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
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
      <ToolPageHeader href="/api-snippet/">
        <p>
          Generate copy-paste-ready cURL, Python requests, and fetch snippets from a single
          endpoint definition. Works client-side, no API keys required.
        </p>
        <p className="text-sm">
          Use it when you need quick request examples for documentation, QA notes, API handoffs,
          or local debugging. Enter the method, URL, headers, body, and authentication shape
          once, then compare generated snippets without pasting private credentials into a
          hosted formatter.
        </p>
      </ToolPageHeader>
      <ApiSnippetClientOnly />
      <ToolNotes title="Why generate snippets in one place">
        <p>
          API examples often drift when every language sample is edited by hand. This generator
          keeps the method, endpoint, headers, query parameters, and request body in one form,
          then turns that shared definition into cURL, fetch, and Python requests examples.
        </p>
        <p>
          That makes it useful for debugging a new endpoint, writing quick documentation,
          preparing QA notes, or sharing an integration example with another developer. The
          generated snippets are meant to be copied, reviewed, and adjusted before they are
          committed to a production code path.
        </p>
      </ToolNotes>
    </ToolPage>
  );
}
