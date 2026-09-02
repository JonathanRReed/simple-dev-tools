'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const MarkdownClient = dynamic(() => import('./MarkdownClient'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading Markdown Preview..." />,
});

export default function MarkdownClientOnly() {
  return <MarkdownClient />;
}
