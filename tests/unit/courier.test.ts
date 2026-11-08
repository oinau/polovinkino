import { describe, expect, it } from 'vitest';
import { COURIER_LEVELS, courierTolerance } from '../../src/levels';
import { courierAsk, courierExplain } from '../../src/lines';

const sp = (s: string) => s.replace(/ /g, ' ');

describe('courier rounds', () => {
  COURIER_LEVELS.forEach((lv, i) => lv.rounds.forEach((r, k) => {
    it(`level ${i + 1} round ${k + 1}: the client lives on the street, on a mark (and a house) when there are marks`, () => {
      const at = r.at.n / r.at.d;
      expect(at).toBeGreaterThan(0);
      expect(at).toBeLessThan(lv.length);
      if (lv.ticks) expect(Number.isInteger(at * lv.ticks)).toBe(true);
      // The arrows move by 1/48: every mark is reachable exactly.
      expect(Number.isInteger(at * 48)).toBe(true);
    });
  }));

  it('by eye is more forgiving than on marks', () => {
    expect(courierTolerance(COURIER_LEVELS[2])).toBeGreaterThan(courierTolerance(COURIER_LEVELS[0]));
  });
});

describe('courier lines', () => {
  it('order and explain', () => {
    expect(courierAsk('osya', { n: 3, d: 4 })).toBe('Ося ждёт пиццу. Дом — три четвёртых пути от пиццерии.');
    expect(sp(courierExplain(COURIER_LEVELS[1], { n: 1, d: 3 }))).toBe('Улица разделена на 6 частей. 1/3 — это 2 части пути от пиццерии.');
    expect(sp(courierExplain(COURIER_LEVELS[2], { n: 2, d: 3 }, true))).toBe('Раздели улицу в уме на три части. Две третьих — это две части пути от пиццерии.');
    expect(courierExplain(COURIER_LEVELS[3], { n: 5, d: 4 })).toBe('5/4 = 1 1/4: проедь отметку 1 и ещё 1/4.');
  });
});
