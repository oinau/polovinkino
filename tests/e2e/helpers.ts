import { expect, type Page } from '@playwright/test';

export const ALL_HEROES = ['pyh', 'ekibas', 'osya', 'tikhon', 'borovik', 'gnomes', 'nosochka', 'pier', 'heron', 'giraffe', 'pip', 'monsters', 'bruno', 'shustrik'];

/** Fresh browser state: sound off, optional progress and introductions. */
export async function openGame(page: Page, save: Record<string, unknown> = {}) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(s => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('polovinkino.v1', JSON.stringify({ stars: { pizza: [], gnomes: [] }, coins: 0, sound: false, ...s }));
      sessionStorage.setItem('seeded', '1');
    }
  }, save);
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__game?.scene.isActive('Town'));
  return errors;
}

export const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('polovinkino.v1')!));

/** Start a scene and close whatever modal it opens first (intro / introduction card). */
export async function startScene(page: Page, key: string, level: number) {
  await page.evaluate(([key, level]) => {
    const g = (window as any).__game;
    g.scene.getScenes(true).forEach((s: any) => g.scene.stop(s.scene.key));
    g.scene.start(key, { level });
  }, [key, level] as const);
  await page.waitForFunction(k => (window as any).__game.scene.isActive(k), key);
}

export async function closeModals(page: Page, key: string) {
  await page.evaluate(k => {
    const s = (window as any).__game.scene.getScene(k);
    s.children.list.filter((o: any) => o.type === 'Container' && o.depth === 100).forEach((o: any) => o.destroy());
  }, key);
}

export async function noErrors(errors: string[]) {
  expect(errors, errors.join('\n')).toEqual([]);
}
