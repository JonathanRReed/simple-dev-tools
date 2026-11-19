'use client';

import { useEffect, useState } from 'react';
import { Check, Monitor, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';

import ThemeSwatch from '@/components/ThemeSwatch';
import { Button } from '@/components/ui/button';
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

export default function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSystem = mounted ? theme === 'system' : false;
  const current = resolveAppThemeId(theme, resolvedTheme);
  const currentLabel = getAppTheme(current)?.label ?? current;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9">
          <Palette />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72">
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
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold leading-tight">System</span>
            {/* While System is active, say which palette it resolved to. */}
            <span className="truncate text-xs text-muted-foreground">
              {isSystem ? `Following your device: ${currentLabel}` : 'Follows your device'}
            </span>
          </span>
          {isSystem ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {appThemes.map((option) => {
          const active = mounted ? !isSystem && current === option.id : false;
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
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold leading-tight">{option.label}</span>
                <span className="truncate text-xs text-muted-foreground">{option.description}</span>
              </span>
              {active ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <p className="px-2 py-1 text-xs text-muted-foreground">Saved in this browser.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
