import { expect, test, type Page } from '@playwright/test';
import { noErrors, openGame } from './helpers';

const scroll = (page: Page) => page.evaluate(() => (window as any).__game.scene.getScene('Town').scroll as number);
const modalOpen = (page: Page) => page.evaluate(() =>
  (window as any).__game.scene.getScene('Town').children.list.some((o: any) => o.depth >= 100));

/** Game coordinates (1920×1080) to page coordinates. */
async function at(page: Page, x: number, y: number) {
  const box = (await page.locator('canvas').boundingBox())!;
  return { x: box.x + (x / 1920) * box.width, y: box.y + (y / 1080) * box.height };
}

test('the map opens at the next place and scrolls by dragging without opening places', async ({ page }) => {
  const errors = await openGame(page, { stars: { pizza: [1, 1, 1, 1, 1], gnomes: [], clock: [] } });
  // Gazebo is next: 980 - 960 = 20.
  expect(await scroll(page)).toBe(20);

  // Drag from the gazebo to the left: the map moves, the gazebo picker does not open.
  const a = await at(page, 980, 650), b = await at(page, 380, 650);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 6, a.y);
  await page.mouse.up();
  await expect.poll(() => scroll(page)).toBeGreaterThan(500);
  expect(await modalOpen(page)).toBe(false);

  // Wheel scrolls too, and never past the end of the world.
  await page.mouse.wheel(0, 99999);
  await expect.poll(() => scroll(page)).toBe(5800 - 1920);
  await noErrors(errors);
});

test('a tap on an open place opens its levels; the arrows ride the map', async ({ page }) => {
  const errors = await openGame(page);
  expect(await scroll(page)).toBe(0);
  const p = await at(page, 340, 650);
  await page.mouse.click(p.x, p.y);
  await expect.poll(() => modalOpen(page)).toBe(true);
  await page.evaluate(() => {
    const t = (window as any).__game.scene.getScene('Town');
    t.children.list.filter((o: any) => o.depth >= 100).forEach((o: any) => o.destroy());
  });
  const r = await at(page, 1920 - 70, 600);
  await page.mouse.click(r.x, r.y);
  await expect.poll(() => scroll(page), { timeout: 10000 }).toBe(1300);
  await noErrors(errors);
});

test('back from a place, the map rides on to the next one', async ({ page }) => {
  const errors = await openGame(page, { stars: { pizza: [1, 1, 1, 1], gnomes: [], clock: [] } });
  expect(await scroll(page)).toBe(0);
  // Finish the last pizzeria shift and come back to the map.
  await page.evaluate(async () => {
    const g = (window as any).__game;
    g.scene.getScene('Town').scene.start('Pizzeria', { level: 4 });
    // The same module instance the game uses (Vite dev server).
    const { store } = await import(/* @vite-ignore */ '/src/store.ts');
    store.setStars('pizza', 4, 1);
  });
  await page.waitForFunction(() => (window as any).__game.scene.isActive('Pizzeria'));
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.scene.getScene('Pizzeria').scene.start('Town');
  });
  await page.waitForFunction(() => (window as any).__game.scene.isActive('Town'));
  await expect.poll(() => scroll(page), { timeout: 10000 }).toBe(20);
  await noErrors(errors);
});

test('the monster house on the mountain opens its rooms; when the road is done the arrow points there', async ({ page }) => {
  const all = { pizza: [1, 1, 1, 1, 1], gnomes: [1, 1, 1], clock: [1, 1, 1], pier: [1, 1, 1], beaver: [1, 1, 1, 1], doctor: [1, 1, 1, 1], potion: [1, 1, 1, 1] };
  const errors = await openGame(page, { stars: all });
  expect(await scroll(page)).toBe(5800 - 1920);
  await page.evaluate(() => (window as any).__game.scene.getScene('Town').openMonsters());
  await expect.poll(() => modalOpen(page)).toBe(true);
  await noErrors(errors);
});
