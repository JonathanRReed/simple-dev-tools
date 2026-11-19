import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
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
      <ToolPageHeader href="/tools/ids-cron/" />
      <IdsCronClientOnly />
      <ToolNotes>
        <ul>
          <li>
            A ULID carries its creation time in the first ten characters. Use a UUID when that
            time should not be visible.
          </li>
          <li>
            Upcoming cron runs are listed in UTC and in your local time zone. Check which zone the
            system that runs the schedule uses.
          </li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/ids-cron/" />
    </ToolPage>
  );
}
