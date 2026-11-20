import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import EncodeQrClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Encoders & QR",
  description:
    "Encode and decode URLs or Base64 text, or make PNG and SVG QR codes with custom size and error correction.",
  alternates: {
    canonical: "/tools/encode-qr/",
  },
};

export default function EncodeQrPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/tools/encode-qr/" />
      <EncodeQrClientOnly />
      <ToolNotes>
        <ul>
          <li>Base64 is just encoding. Anyone who has the string can decode it right back.</li>
          <li>
            Shorter text gives you a simpler QR code that scans faster. Crank up the error
            correction if you&apos;re printing it or sticking a logo over part of it.
          </li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/encode-qr/" />
    </ToolPage>
  );
}
