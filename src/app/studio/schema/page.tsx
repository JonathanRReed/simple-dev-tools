import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import SchemaStudioClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Schema & Types Studio",
  description:
    "Parse JSON/YAML or OpenAPI specs, preview documentation, validate data, and generate TypeScript or Zod types entirely in-browser.",
  alternates: {
    canonical: "/studio/schema/",
  },
};

export default function SchemaStudioPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/studio/schema/">
        <p>
          Paste JSON/YAML or OpenAPI to parse, preview documentation, validate data, and generate
          TypeScript or Zod types entirely in-browser.
        </p>
      </ToolPageHeader>
      <SchemaStudioClientOnly />
      <ToolNotes>
        <ul>
          <li>
            Validation uses Ajv with format support; the generated TypeScript and Zod are meant as
            a starting point to review, not a drop-in contract.
          </li>
          <li>
            Fetching a spec from a URL is optional and only happens when you paste a URL and ask
            for it. Everything else stays on this page.
          </li>
        </ul>
      </ToolNotes>
    </ToolPage>
  );
}
