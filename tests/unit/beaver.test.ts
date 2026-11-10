import { describe, expect, it } from 'vitest';
import { BEAVER_LEVELS } from '../../src/levels';
import { beaverAskMissing, beaverExplain, beaverTooLong, beaverTooShort } from '../../src/lines';
import type { Frac } from '../../src/fractions';

const f = (n: number, d: number): Frac => ({ n, d });
const sp = (s: string) => s.replace(/ /g, ' ');

/** Can some of the planks close the gap exactly? */
function solvable(planks: Frac[], gap: Frac) {
  const L = 12;
  const units = planks.map(p => (p.n * L) / p.d), target = (gap.n * L) / gap.d;
  const reach = new Set([0]);
  for (const u of units) for (const s of [...reach]) reach.add(s + u);
  return reach.has(target);
}

describe('beaver rounds', () => {
  BEAVER_LEVELS.forEach((lv, i) => lv.rounds.forEach((r, k) => {
    it(`level ${i + 1} round ${k + 1} can be closed exactly and fits the bank`, () => {
      const laid = r.laid ?? [];
      const rest = 12 * (r.gap.n / r.gap.d) - laid.reduce((a, p) => a + (12 * p.n) / p.d, 0);
      expect(solvable(r.planks, { n: rest, d: 12 })).toBe(true);
      expect(r.gap.n / r.gap.d).toBeLessThanOrEqual(1);
      if (lv.missing) {
        // One plank closes the rest; the others are one shorter and one longer.
        const units = r.planks.map(p => (12 * p.n) / p.d);
        expect(units.filter(u => u === rest)).toHaveLength(1);
        expect(units.some(u => u < rest) && units.some(u => u > rest)).toBe(true);
      }
      if (lv.stacked) {
        // The stack has rows of 3, 2 and 1.
        expect(r.planks.length).toBeLessThanOrEqual(6);
      } else {
        // The pile lies in one row on the near bank: 600 px per plank, 30 px apart, from x 200.
        const width = r.planks.reduce((a, p) => a + (p.n / p.d) * 600 + 30, 0);
        expect(200 + width).toBeLessThan(1520);
      }
      for (const p of [...r.planks, ...laid]) expect(12 % p.d).toBe(0);
    });
  }));
});

describe('beaver lines', () => {
  it('bring planks to one denominator only when they differ', () => {
    expect(beaverExplain([f(1, 4), f(1, 4), f(1, 4), f(1, 4)], f(1, 1))).toBe('1/4 + 1/4 + 1/4 + 1/4 = 4/4 = 1.');
    expect(beaverExplain([f(1, 2), f(1, 4), f(1, 4)], f(1, 1))).toBe('1/2 + 1/4 + 1/4 = 2/4 + 1/4 + 1/4 = 4/4 = 1.');
    expect(beaverExplain([f(1, 2), f(1, 3), f(1, 6)], f(1, 1))).toBe('1/2 + 1/3 + 1/6 = 3/6 + 2/6 + 1/6 = 6/6 = 1.');
    expect(beaverExplain([f(1, 2), f(1, 4)], f(3, 4))).toBe('1/2 + 1/4 = 2/4 + 1/4 = 3/4.');
    expect(beaverExplain([f(1, 3), f(1, 6), f(1, 6)], f(2, 3))).toBe('1/3 + 1/6 + 1/6 = 2/6 + 1/6 + 1/6 = 4/6 = 2/3.');
  });

  it('speak it', () => {
    expect(beaverExplain([f(1, 2), f(1, 4), f(1, 4)], f(1, 1), true))
      .toBe('Половина — это две четвёртых. Половина плюс одна четвёртая плюс одна четвёртая — ровно одна целая доска.');
    expect(sp(beaverTooLong(f(1, 4), f(1, 3)))).toBe('Не влезает! Осталось 1/4, а доска 1/3 — длиннее.');
    expect(sp(beaverTooShort(f(1, 4), f(1, 6)))).toBe('Мало! Не хватало 1/4, а доска 1/6 — короче. Осталась щель.');
    expect(beaverAskMissing([f(1, 2), f(1, 4)])).toBe('Я уже положил половину и одну четвёртую. Сколько ещё не хватает? Дай одну доску!');
    expect(beaverAskMissing([f(1, 4), f(1, 4), f(1, 6)])).toContain('одну четвёртую, одну четвёртую и одну шестую');
  });
});
