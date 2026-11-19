import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import ColorClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Color & Contrast",
  description:
    "Convert any CSS color between HEX, RGB, HSL, and OKLCH, generate tints and shades, and check WCAG contrast ratios locally in your browser.",
  alternates: {
    canonical: "/tools/color/",
  },
};

export default function ColorPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/tools/color/" />
      <ColorClientOnly />
      <ToolNotes>
        <ul>
          <li>
            Parsing uses your browser&apos;s own CSS engine, so any color syntax it understands
            works here.
          </li>
          <li>OKLCH is computed through the standard sRGB, linear light, LMS, OKLab pipeline.</li>
          <li>Contrast ratios use the WCAG 2.x relative-luminance formula.</li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/color/" />
    </ToolPage>
  );
}
