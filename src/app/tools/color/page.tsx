import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
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
      <ToolPageHeader href="/tools/color/">
        <p>
          Paste any CSS color, including hex, <code>rgb()</code>, <code>hsl()</code>, or a named
          color, and read it back as HEX, RGB, HSL, and OKLCH. Generate a tint-and-shade ramp and
          check foreground/background pairs against WCAG contrast thresholds.
        </p>
        <p>
          Parsing uses your browser&apos;s own CSS engine, so every format it understands works
          here. Nothing leaves your machine.
        </p>
      </ToolPageHeader>
      <ColorClientOnly />
      <ToolNotes title="Why this exists">
        <p>
          Color conversion sites usually want to load a tracker before they show you a hex value.
          This one runs entirely client-side: the OKLCH math is the standard sRGB → linear → LMS
          → OKLab pipeline, and the contrast ratios use the exact WCAG 2.x relative-luminance
          formula. No accounts, no network, no surprises.
        </p>
      </ToolNotes>
    </ToolPage>
  );
}
