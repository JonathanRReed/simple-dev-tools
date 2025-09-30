import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ToolPageProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function ToolPage({ children, className, contentClassName }: ToolPageProps) {
  return (
    <div className={cn('w-full py-4 sm:py-6', className)}>
      <div className={cn('w-full max-w-none', contentClassName)}>{children}</div>
    </div>
  );
}
