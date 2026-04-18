'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const MermaidClient = dynamic(() => import('./MermaidClient'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading Mermaid tool..." />,
});

export default function MermaidClientOnly() {
  return <MermaidClient />;
}
