import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ColorClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Color & Contrast",
  description:
    "Convert any CSS color between HEX, RGB, HSL, and OKLCH, generate tints and shades, and check WCAG contrast ratios — all locally in your browser.",
  alternates: {
    canonical: "/tools/color/",
  },
};

export default function ColorPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Color & Contrast
        </h1>
        <p className="text-muted-foreground">
          Paste any CSS color — hex, <code className="font-mono">rgb()</code>,{" "}
          <code className="font-mono">hsl()</code>, or a named color — and read it
          back as HEX, RGB, HSL, and OKLCH. Generate a tint-and-shade ramp and
          check foreground/background pairs against WCAG contrast thresholds.
        </p>
        <p className="text-muted-foreground">
          Parsing uses your browser&apos;s own CSS engine, so every format it
          understands works here. Nothing leaves your machine.
        </p>
      </header>

      <ColorClientOnly />

      <section className="border-2 border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="brutal-label mb-2 text-foreground">Why this exists</h2>
        <p>
          Color conversion sites usually want to load a tracker before they show
          you a hex value. This one runs entirely client-side: the OKLCH math is
          the standard sRGB → linear → LMS → OKLab pipeline, and the contrast
          ratios use the exact WCAG 2.x relative-luminance formula. No accounts,
          no network, no surprises.
        </p>
      </section>
    </ToolPage>
  );
}
