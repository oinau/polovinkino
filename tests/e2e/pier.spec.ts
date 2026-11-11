import { expect, test, type Page } from '@playwright/test';
import { ALL_HEROES, closeModals, noErrors, openGame, saved, startScene } from './helpers';

// Headless Chromium draws this scene at ~7 fps and game timers follow frames: be patient.
test.describe.configure({ timeout: 240_000 });

const pier = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([fn, args]) => new Function('s', ...((args as unknown[]).map((_, i) => `a${i}`)), fn)(
    (window as any).__game.scene.getScene('Pier'), ...(args as unknown[])), [fn, args] as const);
const phase = (page: Page) => pier(page, 'return s.phase;');
const waitPhase = (page: Page, p: string) => expect.poll(() => phase(page), { timeout: 60000 }).toBe(p);

async function begin(page: Page, level: number) {
  await startScene(page, 'Pier', level);
  await closeModals(page, 'Pier');
  await pier(page, 's.startRound();');
}

/** Put the right share into the sack and press «Отдать». */
const giveRight = (page: Page) =>
  pier(page, 'const n = s.r.total / s.r.frac.d * s.r.frac.n; for (let i = 0; i < n; i++) s.tapChest(); s.giveAway();');

async function playRound(page: Page) {
  const kind = await pier(page, 'return s.r.kind;');
  if (kind === 'give') {
    await waitPhase(page, 'give');
    await giveRight(page);
  } else {
    await waitPhase(page, 'answer');
    await pier(page, `
      const r = s.r, answer = r.part / r.frac.n * r.frac.d;
      s.pickNumber(answer, s.buttons.find(b => b.text.text === String(answer)));`);
  }
  await expect.poll(() => pier(page, 'return s.next.visible;'), { timeout: 60000 }).toBe(true);
  await pier(page, 's.nextRound();');
}

for (const level of [0, 1, 2]) {
  test(`pier level ${level + 1}: fair share → 3 stars`, async ({ page }) => {
    const errors = await openGame(page, { met: ALL_HEROES });
    await begin(page, level);
    for (let i = 0; i < 5; i++) await playRound(page);
    await expect.poll(async () => (await saved(page)).stars.pier?.[level]).toBe(3);
    await noErrors(errors);
  });
}

test('«Отдать» with an empty sack is not a mistake: Rumb says what to do', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 0);
  await waitPhase(page, 'give');
  await pier(page, 's.giveAway();');
  expect(await pier(page, 'return [s.mistakes, s.phase, s.bubbles[1].list.at(-1).text];')).toEqual([0, 'give', 'Кррра! Мешок пустой! Нажимай на сундук — монеты полетят в мешок.']);
  // A coin in and back out again: the sack is empty once more.
  await pier(page, 's.tapChest(); s.tapChest(); s.tapSack();');
  expect(await pier(page, 'return [s.given, s.chest.length, s.sackCount.text];')).toEqual([1, 5, '+1']);
  await noErrors(errors);
});

test('a wrong sack shows the fair piles, then the coins go back to the chest', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 1);
  // Round 1: two thirds of 9. Give 4.
  await waitPhase(page, 'give');
  await pier(page, 'for (let i = 0; i < 4; i++) s.tapChest(); s.giveAway();');
  await expect.poll(() => pier(page, 'return s.mistakes;'), { timeout: 60000 }).toBe(1);
  expect(await pier(page, 'return [s.trays.map(t => t.coins.length), s.trays.map(t => t.selected)];')).toEqual([[3, 3, 3], [true, true, false]]);
  expect(await pier(page, 'return s.guide.pillText.text.replace(/\\u00A0/g, " ");')).toContain('2/3 — это 2 кучки, 6 монет. А в мешке — 4 монеты.');
  await waitPhase(page, 'give');
  expect(await pier(page, 'return [s.chest.length, s.given, s.trays.length];')).toEqual([9, 0, 0]);
  await giveRight(page);
  await expect.poll(() => pier(page, 'return s.next.visible;'), { timeout: 60000 }).toBe(true);
  expect(await pier(page, 'return [s.coins, s.given];')).toEqual([1, 6]);
  await noErrors(errors);
});

test('a wrong number shows the piles, then that answer is locked', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 2);
  // Round 1: a third is 4 coins. Answer 8.
  await waitPhase(page, 'answer');
  await pier(page, "s.pickNumber(8, s.buttons.find(b => b.text.text === '8'));");
  await expect.poll(() => pier(page, 'return s.mistakes;'), { timeout: 60000 }).toBe(1);
  expect(await pier(page, 'return s.trays.map(t => t.coins.length);')).toEqual([4, 4, 4]);
  await waitPhase(page, 'answer');
  expect(await pier(page, "return s.buttons.map(b => [b.text.text, b.enabled]).sort();")).toEqual([['12', true], ['7', true], ['8', false]]);
  expect(await pier(page, 'return s.trays.every(t => t.ghost && !t.coins.length);')).toBe(true);
  await noErrors(errors);
});
