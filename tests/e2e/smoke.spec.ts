import { test } from '@playwright/test';
import { ALL_HEROES, noErrors, openGame, startScene } from './helpers';

test('town map loads', async ({ page }) => {
  const errors = await openGame(page);
  await noErrors(errors);
});

for (const [key, levels] of [['Pizzeria', 5], ['Gnomes', 3], ['Clock', 3], ['Pier', 3], ['Doctor', 4]] as const) {
  for (let level = 0; level < levels; level++) {
    test(`${key} level ${level + 1} starts`, async ({ page }) => {
      const errors = await openGame(page, { met: ALL_HEROES });
      await startScene(page, key, level);
      await page.waitForTimeout(500);
      await noErrors(errors);
    });
  }
}

test('pronunciation page lists the samples', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/pronounce.html');
  await page.waitForSelector('#rows tr');
  const { SAMPLES } = await page.evaluate(() => import(/* @vite-ignore */ '/src/pronounce/samples.ts'));
  await page.waitForFunction(n => document.querySelectorAll('#rows tr').length === n, SAMPLES.length);
  await noErrors(errors);
});
