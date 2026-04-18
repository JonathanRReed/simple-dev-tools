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
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Encoders & QR
        </h1>
        <p className="text-muted-foreground">
          This encoder tool is created by Jonathan R Reed for quick URL and Base64 encoding/decoding.
          Generate QR codes in PNG or SVG formats with no server required.
        </p>
      </header>
      <EncodeQrClientOnly />
    </ToolPage>
  );
}
