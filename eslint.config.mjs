import { createRequire } from 'node:module';
import { defineConfig, globalIgnores } from 'eslint/config';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import imports from 'eslint-plugin-import';
import a11y from 'eslint-plugin-jsx-a11y';
import ts from 'typescript-eslint';
import globals from 'globals';
import localNext from './scripts/lint/next-rules.mjs';

// Preserve the effective eslint-config-next 16.3.8 configuration without its
// fast-glob -> micromatch -> braces dependency. Next's Babel parser remains
// provided by the application's existing Next package, as in the old preset.
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/eslint-parser');
const parser = { parse: babel.parse, parseForESLint: babel.parseForESLint };

export default defineConfig([
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    plugins: { react, 'react-hooks': hooks, import: imports, 'jsx-a11y': a11y, '@next/next': localNext },
    languageOptions: {
      parser,
      parserOptions: {
        requireConfigFile: false,
        sourceType: 'module',
        allowImportExportEverywhere: true,
        babelOptions: { presets: ['next/babel'], caller: { supportsTopLevelAwait: true } },
      },
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: 'detect' },
      'import/parsers': { '@typescript-eslint/parser': ['.ts', '.mts', '.cts', '.tsx', '.d.ts'] },
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      // 7.1.1 recommended expands to 16 rules, including compiler diagnostics.
      // Do not replace it with the two-rule legacy Hooks preset.
      ...hooks.configs.recommended.rules,
      'import/no-anonymous-default-export': 'warn',
      'react/no-unknown-property': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'jsx-a11y/alt-text': ['warn', { elements: ['img'], img: ['Image'] }],
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-location-assign-relative-destination': 'warn',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': ts.plugin },
    languageOptions: { parser: ts.parser, parserOptions: { sourceType: 'module' } },
  },
  {
    // The old unscoped Core Web Vitals layer also covered CommonJS files.
    files: ['**/*.cjs'],
    plugins: { '@next/next': localNext },
    rules: {
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-location-assign-relative-destination': 'warn',
    },
  },
  {
    rules: {
      // Client-only tools coordinate browser storage, parsers, WASM, and
      // asynchronous editor state through effects by design.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'public/sqljs/**',
    'next-env.d.ts',
  ]),
]);
