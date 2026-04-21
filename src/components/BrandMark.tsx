import Image from 'next/image';

import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  label?: string;
};

export default function BrandMark({ className, label = 'Hello.World Consulting logo' }: BrandMarkProps) {
  return (
    <span
      className={cn(
        'brand-mark inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        className
      )}
    >
      <Image
        src="/logo.avif"
        alt={label}
        width={96}
        height={96}
        className="h-full w-full object-cover"
        priority
        sizes="96px"
        unoptimized
      />
    </span>
  );
}
