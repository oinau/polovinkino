import { describe, expect, it } from 'vitest';
import { POTION_LEVELS, potionNumbers, potionOptions } from '../../src/levels';
import { potionAsk, potionExplain, potionPourExplain } from '../../src/lines';
import { sameValue } from '../../src/fractions';

const sp = (s: string) => s.replace(/ /g, ' ');

describe('potion rounds', () => {
  POTION_LEVELS.forEach((lv, i) => lv.rounds.forEach((r, k) => {
    it(`level ${i + 1} round ${k + 1} fits the flask and has three different options`, () => {
      const { start, total, answer } = potionNumbers(r);
      expect(total).toBeLessThanOrEqual(r.d);
      expect(answer).toBeGreaterThan(0);
      expect(start).toBeLessThan(total);
      const opts = potionOptions(r);
      expect(opts).toHaveLength(3);
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(sameValue(opts[a], opts[b])).toBe(false);
      expect(opts.filter(o => sameValue(o, { n: answer, d: r.d }))).toHaveLength(1);
    });
  }));

  it('level 3 always fills the flask', () => {
    for (const r of POTION_LEVELS[2].rounds) expect(potionNumbers(r).total).toBe(r.d);
  });

  it('offers the «add the denominators» mistake', () => {
    const r = POTION_LEVELS[0].rounds[0];
    expect(potionOptions(r).map(o => `${o.n}/${o.d}`)).toEqual(['3/4', '3/8', '2/4']);
  });
});

describe('potion lines', () => {
  it('read the recipe', () => {
    expect(potionAsk({ kind: 'brew', d: 4, recipe: [['frog', 1], ['moon', 2]] })).toBe('Рецепт: одна четвёртая лягушачьего сока и две четвёртых лунной росы.');
    expect(potionAsk({ kind: 'top', d: 6, start: [['moon', 2]], add: 'honey', target: 5 })).toBe('Нужно пять шестых зелья. В колбе уже две шестых лунной росы. Долей мёда!');
    expect(potionAsk({ kind: 'top', d: 4, start: [['frog', 1]], add: 'pepper', target: 4 })).toContain('Нужно четыре четвёртых зелья');
  });

  it('explain the sum', () => {
    expect(potionExplain({ kind: 'brew', d: 4, recipe: [['frog', 1], ['moon', 2]] })).toBe('1/4 + 2/4 = 3/4. Числители складываем, знаменатель не меняется.');
    expect(potionExplain({ kind: 'brew', d: 4, recipe: [['frog', 1], ['honey', 3]] }, true))
      .toBe('Одна четвёртая плюс три четвёртых — это четыре четвёртых. Одна целая — полная колба! Числители складываем, знаменатель не меняется.');
    expect(potionExplain({ kind: 'top', d: 6, start: [['moon', 2]], add: 'honey', target: 5 }, true)).toBe('Нужно пять шестых, было две шестых. Долили три шестых.');
  });

  it('say what was poured wrong', () => {
    const r = { kind: 'brew', d: 4, recipe: [['frog', 1], ['moon', 2]] } as const;
    expect(sp(potionPourExplain({ ...r, recipe: [...r.recipe] }, { frog: 1, moon: 1 }))).toBe('Лунной росы нужно налить 2/4, а налито 1/4.');
    expect(sp(potionPourExplain({ ...r, recipe: [...r.recipe] }, { frog: 1, moon: 2, honey: 1 }))).toBe('Мёда в рецепте нет!');
    expect(sp(potionPourExplain({ ...r, recipe: [...r.recipe] }, { moon: 2 }, true))).toBe('Лягушачьего сока нужно налить одну четвёртую, а в колбе ни капли.');
  });
});
