'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

import { appThemeIds } from '@/lib/themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="art-deco"
      enableSystem={false}
      themes={[...appThemeIds]}
      value={{
        main: 'main',
        moon: 'moon',
        dawn: 'dawn',
        raycast: 'raycast',
        'art-deco': 'art-deco',
        paper: 'paper',
      }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
