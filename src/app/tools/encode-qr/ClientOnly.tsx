'use client';

import dynamic from 'next/dynamic';

import ToolLoading from '@/components/ToolLoading';

const EncodeQrClient = dynamic(() => import('./Client'), {
  ssr: false,
  loading: () => <ToolLoading message="Loading Encoders & QR..." />,
});

export default function EncodeQrClientOnly() {
  return <EncodeQrClient />;
}
