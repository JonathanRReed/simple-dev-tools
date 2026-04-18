'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const SQLiteClient = dynamic(() => import('./SQLiteClient'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading SQLite playground..." />,
});

export default function SQLiteClientOnly() {
  return <SQLiteClient />;
}
