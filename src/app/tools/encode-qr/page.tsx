import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import EncodeQrClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Encoders & QR",
  description:
    "Encode and decode URLs or Base64 text, generate QR codes, tune size and error correction, and export PNG or SVG assets from a local browser workflow.",
  alternates: {
    canonical: "/tools/encode-qr/",
  },
};

export default function EncodeQrPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Encoders & QR
        </h1>
        <p className="text-muted-foreground">
          Encode and decode URLs and Base64, then generate QR codes as PNG or
          SVG. No server required.
        </p>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          Use URL encoding for query values and path segments, Base64 when a
          text-safe representation is required, and QR output when the same
          value needs to move to a phone, label, document, or test device.
        </p>
      </header>
      <EncodeQrClientOnly />
      <section className="border-2 border-border bg-card p-5 text-sm leading-7 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">
          Encoding text and producing reliable QR codes
        </h2>
        <p className="mt-3">
          URL encoding escapes characters that have special meaning inside a
          URL. Base64 changes binary or text data into a portable character set,
          but it does not encrypt or protect the value. Decode and review output
          before moving it into an application or configuration file.
        </p>
        <p className="mt-3">
          For QR codes, use the smallest payload that meets the task and choose
          enough error correction for the print or display environment. Test the
          exported PNG or SVG with more than one scanner before publishing it.
          Inputs and generated assets remain in your browser.
        </p>
      </section>
    </ToolPage>
  );
}
