'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const QueryClient = dynamic(() => import('./QueryClient'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading Querystring Editor..." />,
});

export default function QueryClientOnly() {
  return <QueryClient />;
}
