import dynamic from "next/dynamic";
import type { Metadata } from "next";

import ToolLoading from "@/components/ToolLoading";
import ToolPage from "@/components/layout/ToolPage";

export const metadata: Metadata = {
  title: "Encoders & QR",
  description:
    "Encode/decode URLs and Base64, then generate QR codes in PNG or SVG formats—no server required.",
};

const EncodeQrClient = dynamic(() => import("./Client"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading Encoders & QR…" />
  ),
});

export default function EncodeQrPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Encoders & QR
        </h1>
        <p className="text-muted-foreground">
          Encode/decode URLs and Base64, then generate QR codes in PNG or SVG formats—no server required.
        </p>
      </header>
      <EncodeQrClient />
    </ToolPage>
  );
}
