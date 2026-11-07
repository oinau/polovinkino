import { expect, test, type Page } from '@playwright/test';
import { ALL_HEROES, closeModals, noErrors, openGame, saved, startScene } from './helpers';

// Headless Chromium draws slowly and game tweens follow frames: be patient.
test.describe.configure({ timeout: 240_000 });

const doc = (page: Page, body: string) =>
  page.evaluate(b => new Function('s', b)((window as any).__game.scene.getScene('Doctor')), body);
const until = (page: Page, cond: string) => expect.poll(() => doc(page, `return ${cond};`), { timeout: 60000 }).toBe(true);

async function begin(page: Page, level: number) {
  await startScene(page, 'Doctor', level);
  await closeModals(page, 'Doctor');
  await doc(page, 's.startRound();');
}

/** The right answer for the current round, done through the scene's own handlers. */
async function playRound(page: Page) {
  const kind = await doc(page, 'return s.r.kind;');
  if (kind === 'set') {
    await until(page, "s.phase === 'set'");
    await doc(page, `const H = ${JSON.stringify(await heights(page))}; const h = s.r.h ?? H[s.r.who];
      s.setBar(Math.round(h.n / h.d * s.level.ticks)); s.doMeasure();`);
  } else if (kind === 'read') {
    await until(page, "s.phase === 'answer'");
    await doc(page, `const H = ${JSON.stringify(await heights(page))}; const h = s.r.h ?? H[s.r.who];
      const o = s.r.options.find(o => o.n * h.d === h.n * o.d);
      s.pickHeight(o, s.buttons.find(b => b.text.text === (o.n === o.d ? '1' : o.n + '/' + o.d)));`);
  } else {
    await until(page, "s.phase === 'sort'");
    await doc(page, `const H = ${JSON.stringify(await heights(page))}; const v = w => H[w].n / H[w].d;
      const items = [...s.lineup].sort((a, b) => (s.r.order === 'asc' ? 1 : -1) * (v(a.who) - v(b.who)));
      items.forEach(i => s.pickInOrder(i));`);
  }
  await until(page, 's.next.visible');
  await doc(page, 's.nextRound();');
}

const heights = (page: Page) => page.evaluate(async () => (await import(/* @vite-ignore */ '/src/levels.ts')).HEIGHTS);

for (const [level, rounds] of [[0, 4], [1, 4], [2, 3], [3, 3]] as const) {
  test(`doctor level ${level + 1}: exact heights → 3 stars`, async ({ page }) => {
    const errors = await openGame(page, { met: ALL_HEROES });
    await begin(page, level);
    for (let i = 0; i < rounds; i++) await playRound(page);
    await expect.poll(async () => (await saved(page)).stars.doctor?.[level]).toBe(3);
    await noErrors(errors);
  });
}

test('a bar set too low bonks the patient, who goes back to wait', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 0);
  await until(page, "s.phase === 'set'");
  // Borovik is 1/4: put the bar at 0.
  await doc(page, 's.setBar(0); s.doMeasure();');
  await until(page, 's.mistakes === 1');
  expect(await doc(page, 'return s.guide.pillText.text.replace(/\\u00A0/g, " ");')).toContain('1/4 — это 1 часть снизу');
  await until(page, "s.phase === 'set'");
  expect(await doc(page, 'return Math.round(s.patient.x);')).toBe(1270);
  await noErrors(errors);
});

test('Tikhon turns out as tall as Borovik', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 0);
  for (let i = 0; i < 3; i++) await playRound(page);
  await until(page, "s.phase === 'answer'");
  await doc(page, "s.pickHeight({ n: 1, d: 4 }, s.buttons.find(b => b.text.text === '1/4'));");
  await until(page, 's.next.visible');
  expect(await doc(page, 'return s.guide.pillText.text;')).toContain('Ростом как Дед Боровик!');
  expect(await doc(page, 'return s.wall.map(w => w.who);')).toEqual(['borovik', 'ekibas', 'pyh', 'tikhon']);
  await noErrors(errors);
});

test('the giraffe does not fit: the chart is extended to one and a half houses', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 2);
  await until(page, "s.phase === 'set'");
  expect(await doc(page, 'return [s.extended, s.maxK];')).toEqual([true, 6]);
  await noErrors(errors);
});

test('the doctor measures herself and goes back; the giraffe stretches his neck and returns to the wall', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 2);
  await playRound(page);
  // Round 2: the doctor steps under the chart herself.
  await until(page, "s.phase === 'set'");
  expect(await doc(page, 'return [s.heron.visible, s.patient.texture.key.startsWith("heron")];')).toEqual([false, true]);
  await playRound(page);
  await until(page, "s.phase === 'answer'");
  // Round 3: the same giraffe left the wall, stretched his neck, and the answer «1» is written as «1».
  expect(await doc(page, 'return [s.heron.visible, s.wall.length, Math.round(s.patient.displayHeight)];')).toEqual([true, 0, 720]);
  expect(await doc(page, 'return s.buttons.map(b => b.text.text).sort();')).toEqual(['1', '3/2', '5/4']);
  await doc(page, "s.pickHeight({ n: 3, d: 2 }, s.buttons.find(b => b.text.text === '3/2'));");
  await until(page, 's.wall.length === 1');
  await expect.poll(() => doc(page, 'return [s.wall[0].who, Math.round(s.wall[0].img.displayHeight)];'), { timeout: 60000 }).toEqual(['giraffe', 600]);
  await noErrors(errors);
});

test('sorting: tapping a taller one first is a mistake', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await begin(page, 3);
  await until(page, "s.phase === 'sort'");
  // From the lowest: Borovik (1/4) must come before Pyh (3/4).
  await doc(page, "s.pickInOrder(s.lineup.find(l => l.who === 'pyh'));");
  expect(await doc(page, 'return [s.mistakes, s.picked.length];')).toEqual([1, 0]);
  await noErrors(errors);
});
