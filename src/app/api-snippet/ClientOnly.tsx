'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const ApiSnippetClient = dynamic(() => import('./Client'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading API Snippet Generator..." />,
});

export default function ApiSnippetClientOnly() {
  return <ApiSnippetClient />;
}
