import { expect, test } from 'bun:test';
import { appThemeIds, resolveAppThemeId, themeValues } from './themes';
test('system theme labels agree with the DOM theme mapping', () => {
  expect(resolveAppThemeId('system', 'light')).toBe(themeValues.light);
  expect(resolveAppThemeId('system', 'light')).toBe('paper');
  expect(resolveAppThemeId('system', 'dark')).toBe(themeValues.dark);
  for (const theme of appThemeIds) expect(resolveAppThemeId(theme, 'dark')).toBe(theme);
});
