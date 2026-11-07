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

/** Deal every coin in turn: one into each pile. */
const dealEvenly = (page: Page) =>
  pier(page, 'const d = s.r.frac.d, n = s.chest.length; for (let i = 0; i < n; i++) s.tapTray(s.trays[i % d]);');

async function playRound(page: Page) {
  const kind = await pier(page, 'return s.r.kind;');
  if (kind === 'deal') {
    await dealEvenly(page);
    await waitPhase(page, 'pick');
    await pier(page, 'for (let i = 0; i < s.r.frac.n; i++) s.tapTray(s.trays[i]); s.giveAway();');
  } else {
    await waitPhase(page, 'answer');
    await pier(page, `
      const r = s.r, answer = r.kind === 'whole' ? r.part * r.frac.d : (r.total / r.frac.d) * r.frac.n;
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

test('an uneven deal is a mistake and the coins go back to the chest', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 0);
  // Round 1: half of 6 coins. Four in the first pile, two in the second.
  await pier(page, 'for (let i = 0; i < 4; i++) s.tapTray(s.trays[0]); s.tapTray(s.trays[1]); s.tapTray(s.trays[1]);');
  await expect.poll(() => pier(page, 'return s.mistakes;'), { timeout: 60000 }).toBe(1);
  await waitPhase(page, 'deal');
  expect(await pier(page, 'return [s.chest.length, s.assist];')).toEqual([6, true]);
  await noErrors(errors);
});

test('giving the wrong number of piles is explained and can be fixed', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 1);
  // Round 1: two thirds of 9. Give all three piles.
  await dealEvenly(page);
  await waitPhase(page, 'pick');
  await pier(page, 's.trays.forEach(t => s.tapTray(t)); s.giveAway();');
  expect(await pier(page, 'return [s.mistakes, s.phase, s.trays.some(t => t.selected)];')).toEqual([1, 'pick', false]);
  expect(await pier(page, 'return s.guide.pillText.text;')).toContain('2 кучки из 3');
  await pier(page, 's.tapTray(s.trays[0]); s.tapTray(s.trays[2]); s.giveAway();');
  await expect.poll(() => pier(page, 'return s.next.visible;'), { timeout: 60000 }).toBe(true);
  expect(await pier(page, 'return s.coins;')).toBe(1);
  await noErrors(errors);
});

test('a wrong number shows the piles, then that answer is locked', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 2);
  // Round 1: a third of 12. Answer 6.
  await waitPhase(page, 'answer');
  await pier(page, "s.pickNumber(6, s.buttons.find(b => b.text.text === '6'));");
  await expect.poll(() => pier(page, 'return s.mistakes;'), { timeout: 60000 }).toBe(1);
  expect(await pier(page, 'return s.trays.map(t => t.coins.length);')).toEqual([4, 4, 4]);
  await waitPhase(page, 'answer');
  expect(await pier(page, "return s.buttons.map(b => [b.text.text, b.enabled]).sort();")).toEqual([['3', true], ['4', true], ['6', false]]);
  expect(await pier(page, 'return s.chest.length;')).toBe(12);
  await noErrors(errors);
});
