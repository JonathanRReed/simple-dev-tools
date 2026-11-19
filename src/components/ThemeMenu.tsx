'use client';

import { Check, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

import ThemeSwatch from '@/components/ThemeSwatch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { appThemes, getAppTheme, resolveAppThemeId } from '@/lib/themes';

const itemClass = 'flex items-center gap-3 px-2 py-1.5';

type ThemeMenuProps = {
  /** The button that opens the menu (rendered by ThemeToggle). */
  trigger: React.ReactNode;
};

/**
 * The theme picker's menu. Loaded on demand by ThemeToggle, so the menu and
 * positioning code is not in the bundle every page starts with. It mounts
 * already open, because it is only ever mounted in response to a click.
 */
export default function ThemeMenu({ trigger }: ThemeMenuProps) {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const isSystem = theme === 'system';
  const current = resolveAppThemeId(theme, resolvedTheme);

  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="px-2 text-xs font-semibold text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuItem
          role="menuitemradio"
          aria-checked={isSystem}
          onSelect={(event) => {
            event.preventDefault();
            setTheme('system');
          }}
          className={itemClass}
        >
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground"
          >
            <Monitor className="size-4" />
          </span>
          <span className="flex-1 text-sm font-semibold">System</span>
          {/* While System is active, say which palette the device resolved to. */}
          {isSystem ? (
            <>
              <span className="text-xs text-muted-foreground">{getAppTheme(current)?.label ?? current}</span>
              <Check className="size-4 text-primary" aria-hidden="true" />
            </>
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {appThemes.map((option) => {
          const active = !isSystem && current === option.id;
          return (
            <DropdownMenuItem
              key={option.id}
              role="menuitemradio"
              aria-checked={active}
              onSelect={(event) => {
                event.preventDefault();
                setTheme(option.id);
              }}
              className={itemClass}
            >
              <ThemeSwatch colors={option.swatches} />
              <span className="flex-1 text-sm font-semibold">{option.label}</span>
              {active ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
