'use client';

import { useEffect, useState } from 'react';
import { Check, Moon, Palette, Sun, Sunrise } from 'lucide-react';
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

const THEMES = [
  { id: 'main', label: 'Rosé Pine', description: 'Rich midnight vibes', icon: Palette },
  { id: 'moon', label: 'Moon', description: 'High-contrast twilight', icon: Moon },
  { id: 'dawn', label: 'Dawn', description: 'Soft daylight mode', icon: Sunrise },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];

export default function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (theme ?? resolvedTheme ?? 'main') as ThemeId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-11 w-11 shadow-lg border-border/60">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between">
          Theme
          {mounted && (
            <Badge variant="secondary" className="capitalize bg-secondary/60 text-secondary-foreground">
              {current}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid gap-1">
          {THEMES.map((option) => {
            const Icon = option.icon;
            const active = mounted ? current === option.id : option.id === 'main';
            return (
              <DropdownMenuItem
                key={option.id}
                onSelect={(event) => {
                  event.preventDefault();
                  setTheme(option.id);
                }}
                className="flex items-center gap-3 rounded-md border border-transparent px-3 py-2 focus:bg-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-1 flex-col items-start">
                  <span className="text-sm font-semibold leading-tight">{option.label}</span>
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
