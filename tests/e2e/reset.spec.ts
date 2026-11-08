import { expect, test } from '@playwright/test';
import { ALL_HEROES, noErrors, openGame, saved } from './helpers';

test('«Начать заново» clears stars, coins and introductions but keeps settings', async ({ page }) => {
  const errors = await openGame(page, { stars: { pizza: [3, 2], gnomes: [1] }, coins: 17, met: ALL_HEROES, voice: 'Anna' });
  await page.evaluate(() => {
    const town = (window as any).__game.scene.getScene('Town');
    town.confirmReset();
    // Press «Сбросить» in the confirmation dialog.
    const find = (o: any): any => o.text?.text === 'Сбросить' ? o : (o.list ?? []).map(find).find(Boolean);
    const btn = town.children.list.map(find).find(Boolean);
    btn.emit('pointerup');
  });
  await expect.poll(async () => (await saved(page)).coins).toBe(0);
  const s = await saved(page);
  expect(s.stars).toEqual({ pizza: [], gnomes: [], clock: [], pier: [], beaver: [], doctor: [], potion: [], courier: [], monsters: [] });
  expect(s.met).toEqual([]);
  expect(s.voice).toBe('Anna');
  expect(s.sound).toBe(false);
  await noErrors(errors);
});
