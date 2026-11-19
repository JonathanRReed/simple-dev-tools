import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import FamilyTools from "@/components/tool/FamilyTools";
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
      <ToolPageHeader href="/api-snippet/" />
      <ApiSnippetClientOnly />
      <FamilyTools href="/api-snippet/" />
    </ToolPage>
  );
}
