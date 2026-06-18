'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

import { appThemeIds } from '@/lib/themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      // Follow the OS by default: system dark -> Art Deco, system light -> Paper.
      // An explicit pick in the theme menu overrides and persists.
      defaultTheme="system"
      enableSystem
      themes={[...appThemeIds]}
      value={{
        main: 'main',
        moon: 'moon',
        dawn: 'dawn',
        raycast: 'raycast',
        'art-deco': 'art-deco',
        paper: 'paper',
        dark: 'art-deco',
        light: 'paper',
      }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
