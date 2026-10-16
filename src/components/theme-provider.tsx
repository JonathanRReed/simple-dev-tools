'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

import { appThemeIds, themeValues } from '@/lib/themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      // Follow the OS by default: system dark -> Art Deco, system light -> Paper.
      // An explicit pick in the theme menu overrides and persists.
      defaultTheme="system"
      enableSystem
      themes={[...appThemeIds]}
      value={themeValues}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
