import dynamic from "next/dynamic";

import ToolLoading from "@/components/ToolLoading";

const IdsCronClient = dynamic(() => import("./Client"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading IDs & Scheduling…" />
  ),
});

export default function IdsCronPage() {
  return <IdsCronClient />;
}
