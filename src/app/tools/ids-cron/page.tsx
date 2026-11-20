import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import IdsCronClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "IDs & Scheduling",
  description:
    "Generate UUIDv4 and ULID IDs, pull timestamps out of ULIDs, and decode cron schedules.",
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
            The first ten characters of a ULID encode when it was created. Use a UUID instead if
            you&apos;d rather not expose that timestamp.
          </li>
          <li>
            Next run times show in both UTC and your local zone. Check which time zone your actual
            server runs on.
          </li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/ids-cron/" />
    </ToolPage>
  );
}
