import { describe, expect, it } from 'vitest';
import { MONSTER_LEVELS, monsterAnswer } from '../../src/levels';
import { monsterAsk, monsterExplain } from '../../src/lines';
import { hourPart } from '../../src/time';
import { sameValue, type Frac } from '../../src/fractions';

const sp = (s: string) => s.replace(/ /g, ' ');
const eq = (a: Frac | number, b: Frac | number) => (typeof a === 'number' || typeof b === 'number' ? a === b : sameValue(a, b));

describe('monster rounds', () => {
  MONSTER_LEVELS.forEach(lv => lv.rounds.forEach((r, k) => {
    it(`${lv.name} ${k + 1}: makes sense and has one right option out of three different`, () => {
      const a = monsterAnswer(r);
      const opts = r.options as (Frac | number)[];
      expect(opts).toHaveLength(3);
      expect(opts.filter(o => eq(o, a))).toHaveLength(1);
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(eq(opts[i], opts[j])).toBe(false);
      if (r.kind === 'cake') expect(r.gives.reduce((s, [, n]) => s + n, 0)).toBeLessThan(r.slices);
      if (r.kind === 'web') expect(r.torn).toBeLessThan(r.sectors);
      if (r.kind === 'candles') expect(Number.isInteger(r.total / r.frac.d)).toBe(true);
      if (r.kind === 'grow') expect((r.was + r.grew) / r.d).toBeLessThanOrEqual(1.25);
      if (r.kind === 'clock') expect(hourPart(r.plus)).not.toBeNull();
    });
  }));
});

describe('monster lines', () => {
  const [kitchen, attic, cellar, nursery, parlor] = MONSTER_LEVELS.map(l => l.rounds[0]);
  it('ask', () => {
    expect(monsterAsk(kitchen)).toBe('Раздай торт: папе — три восьмых, малышу — одна восьмая.');
    expect(monsterAsk(attic)).toBe('Ветер порвал три восьмых паутины. Какая часть паутины осталась целой?');
    expect(sp(monsterAsk(cellar))).toBe('Горит 12 свечей. Сквозняк задует одну четвёртую свечей. Сколько свечей погаснет?');
    expect(monsterAsk(nursery)).toBe('Утром рост малыша — одна четвёртая двери. За день он подрос ещё на две четвёртых. Какой у него теперь рост?');
    expect(monsterAsk(parlor)).toBe('Сейчас без двадцати семь. Гости придут через треть часа. Когда придут гости?');
  });

  it('explain', () => {
    expect(monsterExplain(kitchen)).toBe('Отдали 3/8 + 1/8 = 4/8. Осталось 8/8 − 4/8 = 4/8. Это половина торта!');
    expect(sp(monsterExplain(cellar, true))).toBe('Двенадцать свечей на четыре части — по три. Одна четвёртая — это одна часть: три свечи.');
    expect(monsterExplain(MONSTER_LEVELS[3].rounds[2])).toBe('3/4 + 2/4 = 5/4 = 1 1/4: малыш перерос дверь!');
    expect(monsterExplain(parlor)).toBe('Треть часа — это 20 минут. 6:40 + 20 минут = 7:00, ровно семь.');
  });
});
