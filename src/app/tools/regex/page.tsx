import dynamic from "next/dynamic";
import type { Metadata } from "next";

import ToolLoading from "@/components/ToolLoading";

export const metadata: Metadata = {
  title: "Regex Lab",
};

const RegexClient = dynamic(() => import("./Client"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading Regex Lab…" />
  ),
});

export default function RegexPage() {
  return <RegexClient />;
}
