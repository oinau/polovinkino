import { expect, test, type Page } from '@playwright/test';
import { ALL_HEROES, closeModals, noErrors, openGame, saved, startScene } from './helpers';

// Headless Chromium draws slowly and game timers follow frames: be patient.
test.describe.configure({ timeout: 240_000 });

const pot = (page: Page, body: string) =>
  page.evaluate(b => new Function('s', b)((window as any).__game.scene.getScene('Potion')), body);
const until = (page: Page, cond: string) => expect.poll(() => pot(page, `return ${cond};`), { timeout: 60000 }).toBe(true);

async function begin(page: Page, level: number) {
  await startScene(page, 'Potion', level);
  await closeModals(page, 'Potion');
  await pot(page, 's.startRound();');
  await until(page, "s.phase === 'pour'");
}

/** Pour exactly as asked, brew, and pick the right amount. */
async function playRound(page: Page) {
  await until(page, "s.phase === 'pour'");
  await pot(page, `const r = s.r;
    if (r.kind === 'brew') r.recipe.forEach(([id, n]) => { for (let i = 0; i < n; i++) s.pour(id); });
    else { const have = r.start.reduce((a, [, n]) => a + n, 0); for (let i = have; i < r.target; i++) s.pour(r.add); }
    s.brew();`);
  await until(page, "s.phase === 'answer'");
  await pot(page, `const r = s.r, have = r.kind === 'top' ? r.start.reduce((a, [, n]) => a + n, 0) : 0;
    const total = r.kind === 'brew' ? r.recipe.reduce((a, [, n]) => a + n, 0) : r.target, ans = total - have;
    s.answer({ n: ans, d: r.d }, s.buttons.find(b => b.text.text === (ans === r.d ? '1' : ans + '/' + r.d)));`);
  await until(page, 's.next.visible');
  await pot(page, 's.nextRound();');
}

for (const level of [0, 1, 2, 3]) {
  test(`potion level ${level + 1}: brewed by the recipe → 3 stars`, async ({ page }) => {
    const errors = await openGame(page, { met: ALL_HEROES });
    await begin(page, level);
    for (let i = 0; i < 4; i++) await playRound(page);
    await expect.poll(async () => (await saved(page)).stars.potion?.[level]).toBe(3);
    await noErrors(errors);
  });
}

test('overfilling the flask goes boom and empties it', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 0);
  await pot(page, "for (let i = 0; i < 5; i++) s.pour('honey');");
  expect(await pot(page, 'return s.mistakes;')).toBe(1);
  await until(page, "s.phase === 'pour' && s.layers.length === 0");
  await noErrors(errors);
});

test('a wrong recipe fizzles and says what was off', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 0);
  // Round 1 wants 1/4 frog juice and 2/4 moon dew: pour one moon dew only.
  await pot(page, "s.pour('frog'); s.pour('moon'); s.brew();");
  expect(await pot(page, 'return s.mistakes;')).toBe(1);
  expect(await pot(page, 'return s.guide.pillText.text.replace(/\\u00A0/g, " ");')).toContain('Лунной росы нужно налить 2/4, а налито 1/4.');
  await until(page, "s.phase === 'pour' && s.layers.length === 0");
  await noErrors(errors);
});

test('adding the denominators too gets its own hint', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 0);
  await pot(page, "s.pour('frog'); s.pour('moon'); s.pour('moon'); s.brew();");
  await until(page, "s.phase === 'answer'");
  await pot(page, "s.answer({ n: 3, d: 8 }, s.buttons.find(b => b.text.text === '3/8'));");
  expect(await pot(page, 'return s.guide.pillText.text;')).toContain('Знаменатели не складывают: части остались четвёртыми.');
  expect(await pot(page, "return s.buttons.find(b => b.text.text === '3/8').enabled;")).toBe(false);
  await noErrors(errors);
});
