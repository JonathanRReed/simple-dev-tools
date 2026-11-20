import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import DiffClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Text Diff",
  description:
    "Compare two blocks of text side by side or inline with word or line highlights, right on your machine.",
  alternates: {
    canonical: "/tools/diff/",
  },
};

export default function DiffPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-6xl space-y-6">
      <ToolPageHeader href="/tools/diff/" />
      <DiffClientOnly />
      <ToolNotes>
        <ul>
          <li>
            Word diff marks the exact words that changed. Line diff compares one whole line at a
            time.
          </li>
          <li>
            Ignore whitespace and ignore case only affect the diff view and leave your original
            text alone.
          </li>
          <li>
            Hit <kbd>⌘ ↵</kbd> or <kbd>Ctrl ↵</kbd>{" "}
            to run the diff again.
          </li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/diff/" />
    </ToolPage>
  );
}
