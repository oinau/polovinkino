import { describe, expect, it } from 'vitest';
import { GNOME_LEVELS, PIZZA_LEVELS } from '../../src/levels';
import { GNOME_NAMES, explainDispute, truthOf } from '../../src/lines';
import { mul } from '../../src/fractions';

const isInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-9;

describe('pizzeria levels are solvable', () => {
  PIZZA_LEVELS.forEach((lv, li) => {
    lv.orders.forEach((o, oi) => {
      it(`shift ${li + 1}, order ${oi + 1}`, () => {
        const target = o.of ? mul(o.want, o.of) : o.want;
        const left = o.of ? o.of.n / o.of.d : 1;
        // A cut works when the leftover splits into whole slices and the answer is whole slices too.
        const works = (n: number) => isInt(n * left) && isInt((n * target.n) / target.d) && (n * target.n) / target.d <= n * left;
        if (o.preCut) {
          const canRecut = lv.cuts.some(works);
          expect(works(o.preCut) || canRecut, `pre-cut ${o.preCut} cannot give ${target.n}/${target.d}`).toBe(true);
        } else {
          expect(lv.cuts.length, 'player must be able to cut').toBeGreaterThan(0);
          expect(lv.cuts.some(works), `no cut gives ${target.n}/${target.d}`).toBe(true);
        }
        expect(target.n).toBeLessThanOrEqual(target.d);
      });
    });
  });

  it('shifts without cut buttons have every pizza pre-cut', () => {
    for (const lv of PIZZA_LEVELS.filter(l => !l.cuts.length)) {
      for (const o of lv.orders) expect(o.preCut ?? o.of?.d, lv.name).toBeTruthy();
    }
  });
});

describe('gnome disputes', () => {
  GNOME_LEVELS.forEach((lv, li) => {
    lv.rounds.forEach((d, ri) => {
      it(`level ${li + 1}, round ${ri + 1}: explanation matches the answer`, () => {
        const truth = truthOf(d);
        const why = explainDispute(d);
        if (truth === 'equal') expect(why).toContain('поровну');
        else if (!why.startsWith('Чем на больше частей')) expect(why).toContain(GNOME_NAMES[truth].gen);
        expect(d.usach.n).toBeLessThanOrEqual(d.usach.d);
        expect(d.ochkarik.n).toBeLessThanOrEqual(d.ochkarik.d);
      });
    });
  });
});
