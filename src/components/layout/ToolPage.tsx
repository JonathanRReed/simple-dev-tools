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
      <div
        className={cn(
          'w-full max-w-none motion-safe:animate-in motion-safe:fade-in-20 motion-safe:duration-300 motion-safe:ease-out',
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
