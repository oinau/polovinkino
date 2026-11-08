import { describe, expect, it } from 'vitest';
import { DOCTOR_LEVELS, HEIGHTS, heightOf } from '../../src/levels';
import { doctorExplain, doctorSetAsk, doctorSortExplain, mixed } from '../../src/lines';
import { sameValue } from '../../src/fractions';

const sp = (s: string) => s.replace(/ /g, ' ');

describe('doctor rounds', () => {
  DOCTOR_LEVELS.forEach((lv, i) => lv.rounds.forEach((r, k) => {
    it(`level ${i + 1} round ${k + 1} fits the chart`, () => {
      if (r.kind === 'sort') {
        expect(lv.ticks).toBe(0);
        expect(new Set(r.who).size).toBe(r.who.length);
        return;
      }
      const h = heightOf(r);
      // The bar snaps to divisions: the height must land on one, at most one and a half houses.
      expect(Number.isInteger((h.n * lv.ticks) / h.d)).toBe(true);
      expect(h.n / h.d).toBeLessThanOrEqual(1.5);
      if (r.kind === 'read') {
        expect(r.options.filter(o => sameValue(o, h))).toHaveLength(1);
        for (const o of r.options) expect(Number.isInteger((o.n * lv.ticks) / o.d) || o.n / o.d > 1).toBe(true);
      }
    });
  }));

  it('Tikhon is as tall as Borovik', () => expect(sameValue(HEIGHTS.tikhon, HEIGHTS.borovik)).toBe(true));
});

describe('doctor lines', () => {
  it('ask', () => {
    expect(doctorSetAsk('borovik', HEIGHTS.borovik)).toBe('Это Дед Боровик. Его рост — одна четвёртая домика. Поставь планку!');
    expect(doctorSetAsk('heron', HEIGHTS.heron)).toBe('Теперь измерь меня! Мой рост — ровно один домик. Поставь планку!');
    expect(doctorSetAsk('giraffe', HEIGHTS.giraffe)).toBe('Это Жорж. Его рост — пять четвёртых домика. Поставь планку!');
  });

  it('explain on the chart', () => {
    expect(sp(doctorExplain({ n: 3, d: 4 }, 4))).toBe('Домик разделён на 4 части. 3/4 — это 3 части снизу.');
    expect(sp(doctorExplain({ n: 1, d: 3 }, 6, true))).toBe('Домик разделён на шесть частей. Одна третья — это две части из шести, две шестых.');
    expect(sp(doctorExplain({ n: 1, d: 4 }, 4, true))).toBe('Домик разделён на четыре части. Одна четвёртая — это одна часть снизу.');
    expect(sp(doctorExplain({ n: 1, d: 3 }, 6))).toBe('Домик разделён на 6 частей. 1/3 — это 2 части из 6, 2/6.');
    expect(doctorExplain({ n: 5, d: 4 }, 4)).toBe('Один целый домик и ещё 1/4: 5/4 = 1 1/4.');
    expect(doctorExplain({ n: 3, d: 2 }, 4, true)).toBe('Три вторых — это один целый домик и ещё половина.');
    expect(doctorExplain({ n: 1, d: 1 }, 4, true)).toBe('Ровно до конька крыши: это один целый домик, четыре четвёртых.');
    expect(mixed({ n: 3, d: 2 })).toBe('3/2 = 1 1/2');
  });

  it('explain sorting', () => {
    expect(doctorSortExplain('borovik', 'pyh', 'asc')).toBe('Сначала тот, кто ниже: Дед Боровик — 1/4 домика, а Пых — 3/4 домика.');
    expect(doctorSortExplain('giraffe', 'heron', 'desc', true))
      .toBe('Сначала тот, кто выше: Жорж — пять четвёртых домика, а Доктор Цапля — ровно один домик.');
  });
});
