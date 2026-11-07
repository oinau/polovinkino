import { test } from '@playwright/test';
import { ALL_HEROES, noErrors, openGame, startScene } from './helpers';

test('town map loads', async ({ page }) => {
  const errors = await openGame(page);
  await noErrors(errors);
});

for (const [key, levels] of [['Pizzeria', 5], ['Gnomes', 3], ['Clock', 3], ['Pier', 3]] as const) {
  for (let level = 0; level < levels; level++) {
    test(`${key} level ${level + 1} starts`, async ({ page }) => {
      const errors = await openGame(page, { met: ALL_HEROES });
      await startScene(page, key, level);
      await page.waitForTimeout(500);
      await noErrors(errors);
    });
  }
}
