import { expect, test, type Page } from '@playwright/test';
import { ALL_HEROES, closeModals, noErrors, openGame, saved, startScene } from './helpers';

// Headless Chromium draws slowly and game timers follow frames: be patient.
test.describe.configure({ timeout: 240_000 });

const bvr = (page: Page, body: string) =>
  page.evaluate(b => new Function('s', b)((window as any).__game.scene.getScene('Beaver')), body);
const until = (page: Page, cond: string) => expect.poll(() => bvr(page, `return ${cond};`), { timeout: 60000 }).toBe(true);

async function begin(page: Page, level: number) {
  await startScene(page, 'Beaver', level);
  await closeModals(page, 'Beaver');
  await bvr(page, 's.startRound();');
  await until(page, '!s.busy');
}

/** Find planks that close the gap exactly (subset sum in twelfths) and tap them. */
const SOLVE = `
  const u = p => p.n * 12 / p.d, target = u(s.r.gap);
  let found = null;
  const go = (i, sum, used) => {
    if (found || sum > target) return;
    if (sum === target) { found = used; return; }
    if (i >= s.planks.length) return;
    go(i + 1, sum + u(s.planks[i].p), [...used, s.planks[i]]);
    go(i + 1, sum, used);
  };
  go(0, 0, []);
  found.forEach(k => s.tap(k));`;

for (const [level, rounds] of [[0, 4], [1, 4], [2, 3], [3, 3]] as const) {
  test(`beaver level ${level + 1}: the bridge mended → 3 stars`, async ({ page }) => {
    const errors = await openGame(page, { met: ALL_HEROES });
    await begin(page, level);
    for (let i = 0; i < rounds; i++) {
      await until(page, '!s.busy');
      await bvr(page, SOLVE);
      await until(page, 's.next.visible');
      await bvr(page, 's.nextRound();');
    }
    await expect.poll(async () => (await saved(page)).stars.beaver?.[level]).toBe(3);
    await noErrors(errors);
  });
}

test('a plank longer than what is left does not fit and goes back', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 3);
  // Round 1: a hole of 3/4. Half, then the third: only a quarter is left.
  await bvr(page, "s.tap(s.planks.find(k => k.p.d === 2)); s.tap(s.planks.find(k => k.p.d === 3));");
  expect(await bvr(page, 'return [s.mistakes, s.placed.length];')).toEqual([1, 1]);
  expect(await bvr(page, 'return s.guide.pillText.text.replace(/\\u00A0/g, " ");')).toContain('Осталось 1/4, а доска 1/3');
  await until(page, '!s.busy');
  // A quarter closes it; the explanation brings the planks to quarters.
  await bvr(page, "s.tap(s.planks.find(k => k.p.d === 4));");
  await until(page, 's.next.visible');
  expect(await bvr(page, 'return s.guide.pillText.text;')).toContain('1/2 + 1/4 = 2/4 + 1/4 = 3/4.');
  await noErrors(errors);
});

test('a plank in the bridge goes back to the bank when tapped', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 0);
  await bvr(page, 's.tap(s.planks[0]); s.tap(s.planks[1]); s.tap(s.planks[0]);');
  expect(await bvr(page, 'return [s.placed.length, s.planks[0].placed, s.filled()];')).toEqual([1, false, 1]);
  await noErrors(errors);
});
