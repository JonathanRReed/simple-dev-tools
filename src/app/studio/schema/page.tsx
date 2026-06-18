import ToolPage from "@/components/layout/ToolPage";
import SchemaStudioClientOnly from "./ClientOnly";

export default function SchemaStudioPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Schema &amp; Types Studio
        </h1>
        <p className="text-muted-foreground">
          Paste JSON/YAML or OpenAPI to parse, preview documentation, validate data, and generate
          TypeScript or Zod types entirely in-browser.
        </p>
      </header>
      <SchemaStudioClientOnly />
    </ToolPage>
  );
}
