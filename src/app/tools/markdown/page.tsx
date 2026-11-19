import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import MarkdownClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Markdown Preview",
  description:
    "Paste Markdown and see a clean, sanitized rendered preview. Copy the sanitized HTML or download a standalone document. Everything runs in your browser.",
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
            Raw HTML in Markdown is parsed by <code>marked</code> and then filtered by DOMPurify
            before rendering.
          </li>
          <li>
            Use <kbd>⌘ ↵</kbd> or <kbd>Ctrl ↵</kbd> while editing to
            copy the sanitized HTML.
          </li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/markdown/" />
    </ToolPage>
  );
}
