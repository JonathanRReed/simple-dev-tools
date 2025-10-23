import dynamic from "next/dynamic";
import type { Metadata } from "next";

import ToolLoading from "@/components/ToolLoading";

export const metadata: Metadata = {
  title: "API Snippet Generator",
};

const ApiSnippetClient = dynamic(() => import("./Client"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading API Snippet Generator…" />
  ),
});

export default function ApiSnippetPage() {
  return <ApiSnippetClient />;
}
