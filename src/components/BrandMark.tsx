import Image from 'next/image';

import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  label?: string;
};

export default function BrandMark({ className, label = 'Simple Dev Tools logo' }: BrandMarkProps) {
  return (
    <span
      className={cn(
        'brand-mark inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        className
      )}
    >
      <Image
        src="/simple_dev_tools_logo_assets/simple-dev-tools-favicon-256x256.png"
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
