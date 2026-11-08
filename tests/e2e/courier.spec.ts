import { expect, test, type Page } from '@playwright/test';
import { ALL_HEROES, closeModals, noErrors, openGame, saved, startScene } from './helpers';

// Headless Chromium draws slowly and game timers follow frames: be patient.
test.describe.configure({ timeout: 240_000 });

const cur = (page: Page, body: string) =>
  page.evaluate(b => new Function('s', b)((window as any).__game.scene.getScene('Courier')), body);
const until = (page: Page, cond: string) => expect.poll(() => cur(page, `return ${cond};`), { timeout: 60000 }).toBe(true);

async function begin(page: Page, level: number) {
  await startScene(page, 'Courier', level);
  await closeModals(page, 'Courier');
  await cur(page, 's.startRound();');
  await until(page, "s.phase === 'ready'");
}

/** Ride, stop roughly, then use the arrows to reach the client exactly, and deliver. */
const DRIVE_TO_CLIENT = `
  s.go(); s.setPos(0.1); s.stop();
  const at = s.r.at.n / s.r.at.d;
  for (let i = 0; i < 200 && Math.abs(s.pos - at) > 1e-9; i++) s.nudge(s.pos < at ? 1 : -1);
  s.deliver();`;

for (const level of [0, 1, 2, 3]) {
  test(`courier level ${level + 1}: every pizza to the door → 3 stars`, async ({ page }) => {
    const errors = await openGame(page, { met: ALL_HEROES });
    await begin(page, level);
    for (let i = 0; i < 4; i++) {
      await until(page, "s.phase === 'ready'");
      await cur(page, DRIVE_TO_CLIENT);
      await until(page, 's.next.visible');
      await cur(page, 's.nextRound();');
    }
    await expect.poll(async () => (await saved(page)).stars.courier?.[level]).toBe(3);
    await noErrors(errors);
  });
}

test('riding past the client: he calls out, the spot is flagged, and you can ride back', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 0);
  // Osya lives at 1/2: stop at 3/4.
  await cur(page, 's.go(); s.setPos(0.75); s.stop(); s.deliver();');
  expect(await cur(page, 'return [s.mistakes, !!s.flag, s.bubble.list.some(o => o.text === "Эй, я здесь! Ты проехал!")];')).toEqual([1, true, true]);
  expect(await cur(page, 'return s.guide.pillText.text.replace(/\\u00A0/g, " ");')).toContain('1/2 — это 2 части от пиццерии.');
  await cur(page, 'for (let i = 0; i < 12; i++) s.nudge(-1); s.deliver();');
  await until(page, 's.next.visible');
  expect(await cur(page, 'return s.coins;')).toBe(1);
  await noErrors(errors);
});

test('by eye a little off still counts; reaching the end of the street stops the scooter', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 2);
  // Borovik is at 1/2: 1/2 + 2/48 is close enough by eye.
  await cur(page, 's.go(); s.setPos(0.5 + 2 / 48); s.stop(); s.deliver();');
  await until(page, 's.next.visible');
  await cur(page, 's.nextRound();');
  await until(page, "s.phase === 'ready'");
  await cur(page, 's.go(); s.setPos(0.999);');
  await until(page, "s.phase === 'stopped'");
  expect(await cur(page, 'return s.pos;')).toBe(1);
  await noErrors(errors);
});
