import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  label?: string;
};

/**
 * The brand mark is the `/` key: the one that opens search from anywhere on
 * the site. It is drawn as a keycap on its lip, in the active theme's primary
 * color, so it stays crisp at any size and follows every theme. The favicon
 * set in /public is the same drawing in the default palette.
 */
export default function BrandMark({ className, label = 'Simple Dev Tools logo' }: BrandMarkProps) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 32 32"
      className={cn('aspect-square shrink-0', className)}
    >
      <rect x="1" y="4" width="30" height="27" rx="7.5" fill="color-mix(in oklab, hsl(var(--primary)) 54%, black)" />
      <rect x="1" y="1" width="30" height="26" rx="7.5" fill="hsl(var(--primary))" />
      <path
        d="M19.6 6.8 12.4 21.2"
        fill="none"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
