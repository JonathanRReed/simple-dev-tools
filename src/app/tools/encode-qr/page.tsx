import dynamic from "next/dynamic";
import type { Metadata } from "next";

import ToolLoading from "@/components/ToolLoading";

export const metadata: Metadata = {
  title: "Encoders & QR",
};

const EncodeQrClient = dynamic(() => import("./Client"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading Encoders & QR…" />
  ),
});

export default function EncodeQrPage() {
  return <EncodeQrClient />;
}
