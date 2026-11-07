import { expect, test } from '@playwright/test';
import { ALL_HEROES, closeModals, noErrors, openGame, saved, startScene } from './helpers';

const truthInPage = () => {
  const s = (window as any).__game.scene.getScene('Gnomes');
  const { usach: a, ochkarik: b } = s.dispute;
  const c = a.n * b.d - b.n * a.d;
  return c > 0 ? 'usach' : c < 0 ? 'ochkarik' : 'equal';
};

for (const level of [0, 1, 2]) {
  test(`level ${level + 1}: fair judge → 3 stars`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = await openGame(page, { met: ALL_HEROES });
    await startScene(page, 'Gnomes', level);
    await closeModals(page, 'Gnomes');
    const rounds = await page.evaluate(() => (window as any).__game.scene.getScene('Gnomes').level.rounds.length);
    await page.evaluate(() => (window as any).__game.scene.getScene('Gnomes').startRound());
    for (let i = 0; i < rounds; i++) {
      const truth = await page.evaluate(truthInPage);
      await page.evaluate(t => (window as any).__game.scene.getScene('Gnomes').answer(t), truth);
      await page.waitForFunction(() => (window as any).__game.scene.getScene('Gnomes').next.visible);
      await page.evaluate(() => (window as any).__game.scene.getScene('Gnomes').nextRound());
    }
    await expect.poll(async () => (await saved(page)).stars.gnomes[level]).toBe(3);
    await noErrors(errors);
  });
}

test('a wrong verdict counts a mistake and explains', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await startScene(page, 'Gnomes', 0);
  await closeModals(page, 'Gnomes');
  await page.evaluate(() => (window as any).__game.scene.getScene('Gnomes').startRound());
  const truth = await page.evaluate(truthInPage);
  await page.evaluate(t => (window as any).__game.scene.getScene('Gnomes').answer(t === 'usach' ? 'ochkarik' : 'usach'), truth);
  await page.waitForFunction(() => (window as any).__game.scene.getScene('Gnomes').next.visible);
  expect(await page.evaluate(() => (window as any).__game.scene.getScene('Gnomes').mistakes)).toBe(1);
  await noErrors(errors);
});
