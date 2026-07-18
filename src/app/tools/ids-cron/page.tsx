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
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          IDs & Scheduling
        </h1>
        <p className="text-muted-foreground">
          Generate UUIDv4 and ULID identifiers, inspect their parts, and humanize cron expressions with quick presets.
        </p>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          Use the ID tools to create opaque random identifiers or sortable ULIDs,
          then inspect a ULID timestamp before it enters a fixture, migration, or
          test record. The cron helper translates schedules into plain language
          so timing mistakes are easier to catch before deployment.
        </p>
      </header>
      <IdsCronClientOnly />
      <section className="border-2 border-border bg-card p-5 text-sm leading-7 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">
          Choosing an ID and checking a schedule
        </h2>
        <p className="mt-3">
          UUIDv4 values are random and widely supported. ULIDs also contain a
          timestamp and sort naturally as text, which can help when records need
          a stable creation order. That timestamp is visible metadata, so use a
          random identifier when creation time should not be exposed.
        </p>
        <p className="mt-3">
          Cron expressions are compact but easy to misread. Translate the
          expression, verify its time zone in the system that will run it, and
          check edge cases such as month boundaries and daylight-saving changes.
          The generated values and schedule descriptions stay in your browser.
        </p>
      </section>
    </ToolPage>
  );
}
