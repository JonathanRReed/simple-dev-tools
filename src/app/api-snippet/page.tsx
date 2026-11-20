import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import ApiSnippetClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "API Snippet Generator",
  description:
    "Turn one API endpoint, headers, and JSON body into cURL, Python requests, and JavaScript fetch snippets.",
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
