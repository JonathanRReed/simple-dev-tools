import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import SchemaStudioClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Schema & Types Studio",
  description:
    "Parse JSON, YAML, or OpenAPI specs, read rendered docs, validate payloads, and generate TypeScript or Zod.",
  alternates: {
    canonical: "/studio/schema/",
  },
};

export default function SchemaStudioPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/studio/schema/" />
      <SchemaStudioClientOnly />
      <ToolNotes>
        <ul>
          <li>
            Validation uses Ajv with format checks. Look over any generated TypeScript or Zod
            before dropping it into a real codebase.
          </li>
          <li>
            This page only fetches a remote spec when you paste a URL and click fetch. Everything
            else stays local.
          </li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/studio/schema/" />
    </ToolPage>
  );
}
