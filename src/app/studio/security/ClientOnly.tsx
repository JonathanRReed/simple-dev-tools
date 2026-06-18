'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const SecurityTokensClient = dynamic(() => import('./SecurityTokensClient'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading Security & Tokens..." />,
});

export default function SecurityTokensClientOnly() {
  return <SecurityTokensClient />;
}
