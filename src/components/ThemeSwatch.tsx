import { cn } from '@/lib/utils';

type ThemeSwatchProps = {
  /** Body color, then two key colors. */
  colors: readonly string[];
  className?: string;
};

/** A theme drawn as a tiny instrument: its body color with two key colors. */
export default function ThemeSwatch({ colors, className }: ThemeSwatchProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-7 shrink-0 items-center justify-center gap-[3px] rounded-md border border-border',
        className
      )}
      style={{ backgroundColor: colors[0] }}
    >
      <span className="size-[28%] rounded-full" style={{ backgroundColor: colors[1] }} />
      <span className="size-[28%] rounded-full" style={{ backgroundColor: colors[2] }} />
    </span>
  );
}
