'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const SchemaStudioClient = dynamic(() => import('./SchemaStudioClient'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading Schema & Types Studio..." />,
});

export default function SchemaStudioClientOnly() {
  return <SchemaStudioClient />;
}
