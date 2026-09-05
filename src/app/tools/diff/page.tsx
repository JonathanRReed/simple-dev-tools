import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import DiffClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Text Diff",
  description:
    "Compare two texts side by side or unified, with word- or line-level highlighting. Everything runs locally in your browser, and nothing is uploaded.",
  alternates: {
    canonical: "/tools/diff/",
  },
};

export default function DiffPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-6xl space-y-6">
      <ToolPageHeader href="/tools/diff/">
        <p>
          Paste two versions of a text and see the difference instantly. Switch between
          side-by-side and unified views, highlight words or whole lines, and copy or download
          the patch.
        </p>
        <p>Every byte stays on this page. Diffing, rendering, and exports all run client-side.</p>
      </ToolPageHeader>
      <DiffClientOnly />
      <ToolNotes>
        <ul>
          <li>
            Word-level diff highlights individual changed words; line-level diff treats each line
            as a unit.
          </li>
          <li>
            Ignore whitespace and ignore case options normalize comparison without changing the
            original text.
          </li>
          <li>
            Use <kbd className="font-mono">⌘ ↵</kbd> or <kbd className="font-mono">Ctrl ↵</kbd>{" "}
            to recompute.
          </li>
        </ul>
      </ToolNotes>
    </ToolPage>
  );
}
