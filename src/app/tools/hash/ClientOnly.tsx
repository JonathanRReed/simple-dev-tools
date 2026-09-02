"use client";

import dynamic from "next/dynamic";

import ToolLoading from "@/components/ToolLoading";

const HashClient = dynamic(() => import("./HashClient"), {
  ssr: false,
  loading: () => <ToolLoading message="Loading hash checker..." />,
});

export default function HashClientOnly() {
  return <HashClient />;
}
