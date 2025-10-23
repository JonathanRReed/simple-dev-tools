import dynamic from "next/dynamic";
import type { Metadata } from "next";

import ToolLoading from "@/components/ToolLoading";

export const metadata: Metadata = {
  title: "IDs & Scheduling",
};

const IdsCronClient = dynamic(() => import("./Client"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading IDs & Scheduling…" />
  ),
});

export default function IdsCronPage() {
  return <IdsCronClient />;
}
