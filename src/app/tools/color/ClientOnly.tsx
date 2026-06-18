'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const ColorClient = dynamic(() => import('./ColorClient'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading color tools..." />,
});

export default function ColorClientOnly() {
  return <ColorClient />;
}
