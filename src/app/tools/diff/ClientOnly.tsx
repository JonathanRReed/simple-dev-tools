'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const DiffClient = dynamic(() => import('./DiffClient'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading Text Diff..." />,
});

export default function DiffClientOnly() {
  return <DiffClient />;
}
