'use client';

import { useEffect, useState } from 'react';
import { Check, Command, Gem, Monitor, Moon, Palette, Sun, Sunrise } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { appThemes, getAppTheme, type AppThemeId } from '@/lib/themes';
import { cn } from '@/lib/utils';

const THEME_ICONS = {
  main: Palette,
  moon: Moon,
  dawn: Sunrise,
  raycast: Command,
  'art-deco': Gem,
  paper: Sun,
} as const satisfies Record<AppThemeId, typeof Palette>;

export default function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSystem = mounted ? theme === 'system' : false;
  const current = ((isSystem ? resolvedTheme : theme) ?? resolvedTheme ?? 'art-deco') as AppThemeId;
  const currentTheme = getAppTheme(current) ?? appThemes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="size-9 border-2 border-border">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          Theme
          {mounted && (
            <Badge variant="secondary" className="bg-secondary/60 text-secondary-foreground">
              {isSystem ? `System · ${currentTheme.label}` : currentTheme.label}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid gap-1">
          <DropdownMenuItem
            role="menuitemradio"
            aria-checked={isSystem}
            onSelect={(event) => {
              event.preventDefault();
              setTheme('system');
            }}
            className="flex items-center gap-3 rounded-none border-2 border-transparent px-3 py-2 focus:border-border focus:bg-muted"
          >
            <div className="flex size-9 items-center justify-center rounded-none border-2 border-border bg-card text-primary">
              <Monitor className="h-4 w-4" />
            </div>
            <div className="flex flex-1 flex-col items-start">
              <span className="text-sm font-semibold leading-tight">System</span>
              <span className="text-xs text-muted-foreground">Match your OS appearance</span>
            </div>
            {isSystem && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          {appThemes.map((option) => {
            const Icon = THEME_ICONS[option.id];
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
                className="flex items-center gap-3 rounded-none border-2 border-transparent px-3 py-2 focus:border-border focus:bg-muted"
              >
                <div className="flex size-9 items-center justify-center rounded-none border-2 border-border bg-card text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-1 flex-col items-start">
                  <span className="flex w-full items-center justify-between gap-3 text-sm font-semibold leading-tight">
                    {option.label}
                    <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
                      {option.swatches.map((swatch) => (
                        <span
                          key={swatch}
                          className={cn(
                            'size-2.5 rounded-none border border-border',
                            active && 'border-primary'
                          )}
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
                {active && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs text-muted-foreground">
          Theme preference is saved locally
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
