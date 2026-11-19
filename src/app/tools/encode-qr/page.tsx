import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
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
      <ToolPageHeader href="/tools/encode-qr/" />
      <EncodeQrClientOnly />
      <ToolNotes>
        <ul>
          <li>Base64 is an encoding, not encryption. Anyone can decode it.</li>
          <li>
            A QR code scans more reliably with a short payload. Raise the error correction level
            for print or for codes that may be partly covered.
          </li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/encode-qr/" />
    </ToolPage>
  );
}
