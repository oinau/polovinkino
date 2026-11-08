import { expect, test, type Page } from '@playwright/test';
import { ALL_HEROES, closeModals, noErrors, openGame, saved, startScene } from './helpers';

// Headless Chromium draws slowly and game timers follow frames: be patient.
test.describe.configure({ timeout: 240_000 });

const mon = (page: Page, body: string) =>
  page.evaluate(b => new Function('s', b)((window as any).__game.scene.getScene('Monsters')), body);
const until = (page: Page, cond: string) => expect.poll(() => mon(page, `return ${cond};`), { timeout: 60000 }).toBe(true);

async function begin(page: Page, level: number) {
  await startScene(page, 'Monsters', level);
  await closeModals(page, 'Monsters');
  await mon(page, 's.startRound();');
}

const RIGHT = `const r = s.r, i = r.options.findIndex(o => s.isRight(o)); s.answer(r.options[i], s.buttons.find(b => b.text.text === (
  typeof r.options[i] === 'number' ? (r.kind === 'clock' ? Math.floor(r.options[i] / 60 % 12 || 12) + ':' + String(r.options[i] % 60).padStart(2, '0') : String(r.options[i]))
  : r.options[i].n === r.options[i].d ? '1' : r.options[i].n + '/' + r.options[i].d)));`;

async function playRound(page: Page) {
  const kind = await mon(page, 'return s.r.kind;');
  if (kind === 'cake') {
    await until(page, "s.phase === 'act'");
    await mon(page, 's.items.forEach(g => s.giveSlice(g));');
  }
  await until(page, "s.phase === 'answer'");
  await mon(page, RIGHT);
  if (kind === 'web') { await until(page, "s.phase === 'act'"); await mon(page, 's.items.forEach((g, i) => s.mend(g, i));'); }
  if (kind === 'candles') { await until(page, "s.phase === 'act'"); await mon(page, 's.items.forEach(g => s.light(g));'); }
  await until(page, 's.next.visible');
  await mon(page, 's.nextRound();');
}

for (const level of [0, 1, 2, 3, 4]) {
  test(`monster house room ${level + 1}: all right → 3 stars`, async ({ page }) => {
    const errors = await openGame(page, { met: ALL_HEROES });
    await begin(page, level);
    for (let i = 0; i < 3; i++) await playRound(page);
    await expect.poll(async () => (await saved(page)).stars.monsters?.[level]).toBe(3);
    await noErrors(errors);
  });
}

test('the cake gives each monster exactly their share', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 0);
  await until(page, "s.phase === 'act'");
  // Tap every slice: only 3 + 1 fly off, the rest stay on the plate.
  await mon(page, 's.items.forEach(g => s.giveSlice(g));');
  expect(await mon(page, 'return [s.given, s.items.filter(g => g.done).length];')).toEqual([[3, 1], 4]);
  await noErrors(errors);
});

test('a wrong number of candles is shown by the draught, then the candles light again', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 2);
  await until(page, "s.phase === 'answer'");
  await mon(page, "s.answer(6, s.buttons.find(b => b.text.text === '6'));");
  await until(page, 's.items.filter(c => !c.done).length === 3');
  await until(page, "s.phase === 'answer' && s.items.every(c => c.done)");
  expect(await mon(page, 'return s.mistakes;')).toBe(1);
  await noErrors(errors);
});

test('the whole house done for the first time gives the diploma', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES, stars: { monsters: [3, 3, 3, 3] } });
  await begin(page, 4);
  for (let i = 0; i < 3; i++) await playRound(page);
  await expect.poll(async () => (await saved(page)).met).toContain('diploma');
  expect(await mon(page, "return s.children.list.some(o => o.depth === 100 && o.list?.some(c => c.text === 'Диплом мастера дробей'));")).toBe(true);
  await noErrors(errors);
});
