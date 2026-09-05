import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
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
      <ToolPageHeader href="/tools/markdown/">
        <p>
          Type or paste Markdown on the left and get a live, DOMPurify-sanitized preview on the
          right. Copy the HTML or download a complete page.
        </p>
        <p>Parsing and sanitization happen entirely in your browser. Nothing is uploaded.</p>
      </ToolPageHeader>
      <MarkdownClientOnly />
      <ToolNotes>
        <ul>
          <li>
            Raw HTML in Markdown is parsed by <code>marked</code> and then filtered by DOMPurify
            before rendering.
          </li>
          <li>The preview updates after a 200 ms debounce and is rendered client-side only.</li>
          <li>
            Use <kbd className="border border-border px-1 font-mono">⌘ ↵</kbd> while editing to
            copy the sanitized HTML.
          </li>
        </ul>
      </ToolNotes>
    </ToolPage>
  );
}
