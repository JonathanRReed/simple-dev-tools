import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import MarkdownClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Markdown Preview",
  description:
    "Write or paste Markdown for a live sanitized preview, then copy the HTML or save a standalone file.",
  alternates: {
    canonical: "/tools/markdown/",
  },
};

export default function MarkdownPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/tools/markdown/" />
      <MarkdownClientOnly />
      <ToolNotes>
        <ul>
          <li>
            Raw HTML inside your Markdown goes through <code>marked</code> and gets cleaned by
            DOMPurify before showing up.
          </li>
          <li>
            Hit <kbd>⌘ ↵</kbd> or <kbd>Ctrl ↵</kbd> while editing to copy the clean HTML.
          </li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/markdown/" />
    </ToolPage>
  );
}
