'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const TimestampClient = dynamic(() => import('./TimestampClient'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading timestamp converter..." />,
});

export default function TimestampClientOnly() {
  return <TimestampClient />;
}
