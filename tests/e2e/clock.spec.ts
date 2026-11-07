import { expect, test, type Page } from '@playwright/test';
import { ALL_HEROES, closeModals, noErrors, openGame, saved, startScene } from './helpers';

const MET = ALL_HEROES;
const clock = (page: Page) => page.evaluate(() => (window as any).__game.scene.getScene('Clock'));

async function ready(page: Page) {
  await page.waitForFunction(() => !(window as any).__game.scene.getScene('Clock').busy);
}

/** Answer the current round correctly through the scene's methods. */
async function solve(page: Page) {
  await ready(page);
  await page.evaluate(() => {
    const s = (window as any).__game.scene.getScene('Clock');
    const r = s.round;
    if (r.kind === 'read') s.pickTime(r.t, s.buttons[0]);
    else if (r.kind === 'set') {
      while (((s.t % 720) + 720) % 720 !== r.to % 720) s.dragTo((s.t + 5) % 60);
      s.checkSet();
    } else s.pickWait(r.meet - r.now, s.buttons[0]);
  });
}

for (const level of [0, 1, 2]) {
  test(`clock level ${level + 1}: all right → Nosochka comes, 3 stars`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors = await openGame(page, { met: MET });
    await startScene(page, 'Clock', level);
    await closeModals(page, 'Clock');
    const rounds = await page.evaluate(() => (window as any).__game.scene.getScene('Clock').level.rounds.length);
    await page.evaluate(() => (window as any).__game.scene.getScene('Clock').startRound());
    for (let i = 0; i < rounds; i++) {
      await solve(page);
      await page.waitForFunction(n => (window as any).__game.scene.getScene('Clock').roundIndex > n, i, { timeout: 30_000 });
    }
    await expect.poll(async () => (await saved(page)).stars.clock?.[level], { timeout: 30_000 }).toBe(3);
    await noErrors(errors);
  });
}

test('dragging the minute hand past 12 moves the hour on', async ({ page }) => {
  const errors = await openGame(page, { met: MET });
  await startScene(page, 'Clock', 1);
  await closeModals(page, 'Clock');
  await page.evaluate(() => (window as any).__game.scene.getScene('Clock').startRound()); // starts at 2:00
  await ready(page);
  const t = await page.evaluate(() => {
    const s = (window as any).__game.scene.getScene('Clock');
    for (const m of [15, 30, 45, 0, 15]) s.dragTo(m);
    return s.t;
  });
  expect(t).toBe(3 * 60 + 15);
  await noErrors(errors);
});

test('a wrong wait answer first hints, then explains', async ({ page }) => {
  const errors = await openGame(page, { met: MET });
  await startScene(page, 'Clock', 2);
  await closeModals(page, 'Clock');
  await page.evaluate(() => (window as any).__game.scene.getScene('Clock').startRound()); // 2:15 → 2:30
  await ready(page);
  const pill = () => page.evaluate(() => (window as any).__game.scene.getScene('Clock').guide.pillText.text as string);
  await page.evaluate(() => { const s = (window as any).__game.scene.getScene('Clock'); s.pickWait(30, s.buttons[3]); });
  expect(await pill()).toContain('каждое деление — 5 минут');
  await page.evaluate(() => { const s = (window as any).__game.scene.getScene('Clock'); s.pickWait(45, s.buttons[4]); });
  expect(await pill()).toContain('ждать пятнадцать минут');
  expect((await clock(page)).mistakes).toBe(2);
  await noErrors(errors);
});
