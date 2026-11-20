import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import ColorClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Color & Contrast",
  description:
    "Convert CSS colors between HEX, RGB, HSL, and OKLCH, generate tints and shades, and test WCAG contrast.",
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
            Parsing runs through your browser&apos;s CSS engine, so whatever color syntax your
            browser understands works here.
          </li>
          <li>OKLCH converts through the standard sRGB, linear light, LMS, and OKLab math.</li>
          <li>Contrast ratios use the WCAG 2.x relative luminance formula.</li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/color/" />
    </ToolPage>
  );
}
