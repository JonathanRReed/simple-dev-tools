'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const RegexClient = dynamic(() => import('./Client'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading Regex Lab..." />,
});

export default function RegexClientOnly() {
  return <RegexClient />;
}
