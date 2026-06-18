import { Code2, Database, QrCode, Slash } from 'lucide-react';

import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  label?: string;
};

/**
 * The brand mark: a square, 2px-bordered tile holding the 2x2 tool-glyph grid
 * (code, database, slash, QR) — the same four marks as the favicon, but drawn
 * inline so it inherits theme tokens, stays crisp at any size, and carries no
 * glow/blur/gradient (brutalist: square corners, hard borders, no soft light).
 * Each glyph uses a per-theme accent token so the mark reads on every theme,
 * dark or light.
 */
const CELLS = [
  { Icon: Code2, color: 'text-rp-foam' },
  { Icon: Database, color: 'text-rp-love' },
  { Icon: Slash, color: 'text-rp-gold' },
  { Icon: QrCode, color: 'text-rp-iris' },
] as const;

export default function BrandMark({ className, label = 'Simple Dev Tools logo' }: BrandMarkProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'grid aspect-square grid-cols-2 grid-rows-2 gap-px overflow-hidden border-2 border-border bg-border',
        className
      )}
    >
      {CELLS.map(({ Icon, color }, i) => (
        <span key={i} className={cn('flex items-center justify-center bg-card', color)}>
          <Icon className="h-[62%] w-[62%]" strokeWidth={2.25} aria-hidden="true" />
        </span>
      ))}
    </span>
  );
}
