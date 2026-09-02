import { describe, expect, test } from 'bun:test';

import { siteConfig, toolPages } from './site';
import { appThemeIds, appThemes } from './themes';

describe('published catalog', () => {
  test('uses unique canonical tool routes', () => {
    expect(toolPages.length).toBe(15);
    expect(new Set(toolPages.map((tool) => tool.href)).size).toBe(toolPages.length);
    expect(new Set(toolPages.map((tool) => tool.title)).size).toBe(toolPages.length);
    expect(toolPages.every((tool) => tool.href.startsWith('/') && tool.href.endsWith('/'))).toBe(true);
  });

  test('lists every tool in the sitemap and agent index', async () => {
    const [sitemap, llms] = await Promise.all([
      Bun.file('public/sitemap.xml').text(),
      Bun.file('public/llms.txt').text(),
    ]);

    for (const tool of toolPages) {
      const canonical = `${siteConfig.url}${tool.href}`;
      expect(sitemap).toContain(canonical);
      expect(llms).toContain(canonical);
    }
  });
});

describe('theme catalog', () => {
  test('keeps ids unique and aligned with the public options', () => {
    expect(appThemeIds).toEqual(appThemes.map((theme) => theme.id));
    expect(new Set(appThemeIds).size).toBe(appThemeIds.length);
    expect(appThemes.every((theme) => theme.swatches.length === 3)).toBe(true);
  });
});
