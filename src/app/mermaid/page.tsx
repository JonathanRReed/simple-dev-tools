import dynamic from "next/dynamic";

import ToolLoading from "@/components/ToolLoading";
import ToolPage from "@/components/layout/ToolPage";

const MermaidClient = dynamic(() => import("./MermaidClient"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading Mermaid tool…" />
  ),
});

export default function MermaidPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl">
      <MermaidClient />
    </ToolPage>
  );
}
