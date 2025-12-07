import dynamic from "next/dynamic";
import type { Metadata } from "next";

import ToolLoading from "@/components/ToolLoading";
import ToolPage from "@/components/layout/ToolPage";

export const metadata: Metadata = {
  title: "IDs & Scheduling",
  description:
    "Generate UUIDv4 and ULID identifiers, inspect their parts, and humanize cron expressions with quick presets.",
};

const IdsCronClient = dynamic(() => import("./Client"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading IDs & Scheduling…" />
  ),
});

export default function IdsCronPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          IDs & Scheduling
        </h1>
        <p className="text-muted-foreground">
          Generate UUIDv4 and ULID identifiers, inspect their parts, and humanize cron expressions with quick presets.
        </p>
      </header>
      <IdsCronClient />
    </ToolPage>
  );
}
