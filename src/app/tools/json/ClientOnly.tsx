'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const JsonClient = dynamic(() => import('./JsonClient'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading JSON Workbench..." />,
});

export default function JsonClientOnly() {
  return <JsonClient />;
}
