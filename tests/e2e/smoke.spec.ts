import { expect, test } from '@playwright/test';
import { ALL_HEROES, noErrors, openGame, startScene } from './helpers';

test('town map loads', async ({ page }) => {
  const errors = await openGame(page);
  await noErrors(errors);
});

for (const [key, levels] of [['Pizzeria', 5], ['Gnomes', 3], ['Clock', 3], ['Pier', 3], ['Beaver', 4], ['Doctor', 4], ['Potion', 4], ['Courier', 4], ['Monsters', 5]] as const) {
  for (let level = 0; level < levels; level++) {
    test(`${key} level ${level + 1} starts`, async ({ page }) => {
      const errors = await openGame(page, { met: ALL_HEROES });
      await startScene(page, key, level);
      await page.waitForTimeout(500);
      await noErrors(errors);
    });
  }
}

test('pronunciation page lists the words and phrases', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/pronounce.html');
  const { WORDS, PHRASES } = await page.evaluate(() => import(/* @vite-ignore */ '/src/pronounce/samples.ts'));
  await page.waitForFunction(([w, p]) =>
    document.querySelectorAll('#words tr').length === w && document.querySelectorAll('#phrases tr').length === p, [WORDS.length, PHRASES.length]);
  // The stress choice is saved for the game on this device.
  await page.check('input[value=acute]');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('polovinkino.v1')!).stress)).toBe('acute');
  await noErrors(errors);
});
