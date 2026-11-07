import { describe, expect, it } from 'vitest';
import { digital, explainTime, hourPart, meetWords, timeWords } from '../../src/time';
import { CLOCK_LEVELS } from '../../src/levels';

const T = (h: number, m: number) => h * 60 + m;

describe('time in words', () => {
  it.each([
    [T(3, 0), 'ровно три', 'ровно в три'],
    [T(12, 0), 'ровно двенадцать', 'ровно в двенадцать'],
    [T(1, 0), 'ровно час', 'ровно в час'],
    [T(2, 30), 'половина третьего', 'в половину третьего'],
    [T(12, 30), 'половина первого', 'в половину первого'],
    [T(2, 15), 'четверть третьего', 'в четверть третьего'],
    [T(2, 45), 'без четверти три', 'без четверти три'],
    [T(11, 45), 'без четверти двенадцать', 'без четверти двенадцать'],
    [T(2, 10), 'десять минут третьего', 'в десять минут третьего'],
    [T(2, 40), 'без двадцати три', 'без двадцати три'],
  ])('%i → %s / %s', (t, words, meet) => {
    expect(timeWords(t)).toBe(words);
    expect(meetWords(t)).toBe(meet);
  });

  it('digital', () => {
    expect(digital(T(2, 5))).toBe('2:05');
    expect(digital(T(12, 30))).toBe('12:30');
  });

  it('explains the hands', () => {
    expect(explainTime(T(2, 30))).toBe('Минутная стрелка на шести: прошло полчаса. Часовая между двумя и тремя. Значит, половина третьего.');
    expect(explainTime(T(3, 0))).toBe('Минутная стрелка на двенадцати, часовая на трёх. Значит, ровно три.');
  });

  it('links minutes to fractions of an hour', () => {
    expect(hourPart(15)).toMatchObject({ n: 1, d: 4 });
    expect(hourPart(20)).toMatchObject({ n: 1, d: 3 });
    expect(hourPart(30)).toMatchObject({ n: 1, d: 2 });
    expect(hourPart(25)).toBeNull();
  });
});

describe('clock levels', () => {
  CLOCK_LEVELS.forEach((lv, li) => {
    lv.rounds.forEach((r, ri) => {
      it(`level ${li + 1}, round ${ri + 1} is answerable`, () => {
        if (r.kind === 'read') {
          expect(r.options).toContain(r.t);
          expect(new Set(r.options.map(timeWords)).size).toBe(r.options.length);
        } else if (r.kind === 'set') {
          expect(r.to).not.toBe(r.from);
          expect(r.to % 5).toBe(0);
        } else {
          expect(r.meet).toBeGreaterThan(r.now);
          expect(r.options).toContain(r.meet - r.now);
        }
      });
    });
  });
});
