import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import IdsCronClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "IDs & Scheduling",
  description:
    "Generate UUIDv4 and ULID identifiers, inspect ULID timestamps, copy values, and humanize cron expressions with practical presets.",
  alternates: {
    canonical: "/tools/ids-cron/",
  },
};

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
      <IdsCronClientOnly />
    </ToolPage>
  );
}
