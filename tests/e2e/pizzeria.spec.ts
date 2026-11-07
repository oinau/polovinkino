import { expect, test, type Page } from '@playwright/test';
import { ALL_HEROES, closeModals, noErrors, openGame, saved, startScene } from './helpers';

const scene = 'Pizzeria';

async function waitForCustomer(page: Page) {
  await page.waitForFunction(() => {
    const s = (window as any).__game.scene.getScene('Pizzeria');
    return s.customer && !s.busy;
  });
}

/** Cut if needed and serve exactly the right slices, through the scene's own methods. */
async function serveCorrectly(page: Page) {
  await waitForCustomer(page);
  await page.evaluate(() => {
    const s = (window as any).__game.scene.getScene('Pizzeria');
    const t = s.target();
    const n = s.pizza.n;
    const need = (t.n * n) / t.d;
    if (!(n > 0 && Number.isInteger(need) && need <= s.pizza.count)) s.chooseCut(s.finerCut().getData('n'));
  });
  await waitForCustomer(page);
  await page.evaluate(() => {
    const s = (window as any).__game.scene.getScene('Pizzeria');
    const t = s.target();
    const need = (t.n * s.pizza.n) / t.d;
    for (let i = 0; i < need; i++) s.pizza.toggle(i);
    s.serve();
  });
}

for (const level of [0, 1, 2, 4]) {
  test(`shift ${level + 1}: all orders right → 3 stars, next shift opens`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = await openGame(page, { met: ALL_HEROES });
    await startScene(page, scene, level);
    await closeModals(page, scene);
    const orders = await page.evaluate(() => (window as any).__game.scene.getScene('Pizzeria').level.orders.length);
    await page.evaluate(() => (window as any).__game.scene.getScene('Pizzeria').nextCustomer());
    for (let i = 0; i < orders; i++) {
      await serveCorrectly(page);
      await page.waitForFunction(n => (window as any).__game.scene.getScene('Pizzeria').orderIndex > n, i, { timeout: 30_000 });
    }
    await expect.poll(async () => (await saved(page)).stars.pizza[level], { timeout: 30_000 }).toBe(3);
    await noErrors(errors);
  });
}

test('a wrong answer counts a mistake and suggests a better cut', async ({ page }) => {
  const errors = await openGame(page, { met: ALL_HEROES });
  await startScene(page, scene, 1); // «Режу сам», first order: 2/3
  await closeModals(page, scene);
  await page.evaluate(() => (window as any).__game.scene.getScene('Pizzeria').nextCustomer());
  await waitForCustomer(page);
  await page.evaluate(() => (window as any).__game.scene.getScene('Pizzeria').chooseCut(2));
  await waitForCustomer(page);
  await page.evaluate(() => {
    const s = (window as any).__game.scene.getScene('Pizzeria');
    s.pizza.toggle(0);
    s.serve();
  });
  await expect.poll(() => page.evaluate(() => (window as any).__game.scene.getScene('Pizzeria').mistakes)).toBe(1);
  // After the reaction the guide explains that 2 parts cannot make 2/3.
  await expect.poll(() => page.evaluate(() => {
    const s = (window as any).__game.scene.getScene('Pizzeria');
    return s.guide.pillText.text as string;
  })).toContain('Разрежь на 3');
  await noErrors(errors);
});

test('the first visit introduces the chef', async ({ page }) => {
  const errors = await openGame(page);
  await startScene(page, scene, 0);
  await expect.poll(() => page.evaluate(() => {
    const s = (window as any).__game.scene.getScene('Pizzeria');
    const texts: string[] = [];
    const walk = (o: any) => { if (o.type === 'Text') texts.push(o.text); (o.list ?? []).forEach(walk); };
    s.children.list.forEach(walk);
    return texts.join(' | ');
  })).toContain('Повар Пых');
  await noErrors(errors);
});
