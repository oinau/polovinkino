import { describe, expect, it } from 'vitest';
import { PIER_LEVELS, pierNumbers } from '../../src/levels';
import { coinsWord, pierAsk, pierExplain, pierGivenNote, pilesWord } from '../../src/lines';

const sp = (s: string) => s.replace(/\u00A0/g, ' ');
const rounds = PIER_LEVELS.flatMap((lv, i) => lv.rounds.map((r, k) => ({ r, where: `level ${i + 1} round ${k + 1}` })));

describe('pier rounds', () => {
  it.each(rounds)('$where: coins split into equal piles that fit the table', ({ r }) => {
    const { total, pile, answer } = pierNumbers(r);
    expect(Number.isInteger(pile)).toBe(true);
    expect(total).toBeLessThanOrEqual(12);
    expect(pile).toBeLessThanOrEqual(6);
    expect(r.frac.d).toBeGreaterThanOrEqual(2);
    expect(r.frac.d).toBeLessThanOrEqual(6);
    expect(r.frac.n).toBeLessThan(r.frac.d);
    if (r.kind === 'whole') {
      expect(r.options).toContain(answer);
      expect(new Set(r.options).size).toBe(r.options.length);
    }
  });

  it('numbers are right', () => {
    expect(pierNumbers({ kind: 'give', who: 'kok', total: 12, frac: { n: 2, d: 3 } })).toEqual({ total: 12, pile: 4, answer: 8 });
    expect(pierNumbers({ kind: 'whole', who: 'kok', part: 8, frac: { n: 2, d: 3 }, options: [] })).toEqual({ total: 12, pile: 4, answer: 12 });
    expect(pierNumbers({ kind: 'whole', who: 'kok', part: 4, frac: { n: 1, d: 3 }, options: [] })).toEqual({ total: 12, pile: 4, answer: 12 });
  });
});

describe('pier lines', () => {
  it('agree numbers with nouns', () => {
    expect([1, 2, 5, 11, 12, 21, 22].map(n => sp(coinsWord(n)))).toEqual(
      ['1 монета', '2 монеты', '5 монет', '11 монет', '12 монет', '21 монета', '22 монеты']);
    expect(sp(pilesWord(3))).toBe('3 кучки');
    expect(sp(pilesWord(6))).toBe('6 кучек');
  });

  it('say numbers in words, agreeing in gender', () => {
    expect(sp(pierExplain({ kind: 'give', who: 'kok', total: 6, frac: { n: 1, d: 2 } }, true)))
      .toBe('Шесть монет на две кучки — по три. Половина — это одна кучка, три монеты.');
    expect(sp(pierExplain({ kind: 'whole', who: 'kok', part: 5, frac: { n: 1, d: 2 }, options: [] }, true)))
      .toBe('Половина — это одна кучка, а всего кучек две. Две кучки по пять — это десять монет.');
  });

  it('ask and explain', () => {
    expect(sp(pierAsk({ kind: 'give', who: 'kok', total: 12, frac: { n: 2, d: 3 } }))).toBe('Отдай коку две третьих клада!');
    expect(sp(pierAsk({ kind: 'give', who: 'rumb', total: 8, frac: { n: 1, d: 4 } }))).toBe('Отдай попугаю Румбу одну четвёртую клада!');
    expect(sp(pierAsk({ kind: 'whole', who: 'kok', part: 5, frac: { n: 1, d: 2 }, options: [] })))
      .toBe('Кок получил половину клада — 5 монет. Сколько монет было в сундуке?');
    expect(sp(pierExplain({ kind: 'give', who: 'kok', total: 12, frac: { n: 2, d: 3 } }, true)))
      .toBe('Двенадцать монет на три кучки — по четыре. Две третьих — это две кучки, восемь монет.');
    expect(sp(pierExplain({ kind: 'whole', who: 'kok', part: 4, frac: { n: 1, d: 3 }, options: [] })))
      .toBe('1/3 — это одна кучка, а всего кучек 3. 3 кучки по 4 — это 12 монет.');
    expect(sp(pierExplain({ kind: 'whole', who: 'kok', part: 8, frac: { n: 2, d: 3 }, options: [] })))
      .toBe('2/3 — это 2 кучки, 8 монет: по 4 в кучке. А всего кучек 3. 3 кучки по 4 — это 12 монет.');
    expect(sp(pierGivenNote(4))).toBe('А в мешке — 4 монеты.');
  });
});
