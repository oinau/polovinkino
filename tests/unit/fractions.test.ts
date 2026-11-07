import { describe, expect, it } from 'vitest';
import { compare, mul, sameValue, simplify, words } from '../../src/fractions';

const f = (n: number, d: number) => ({ n, d });

describe('words', () => {
  it.each([
    [f(1, 2), 'половина', 'половину', 'половины'],
    [f(1, 3), 'одна третья', 'одну третью', 'одной третьей'],
    [f(2, 3), 'две третьих', 'две третьих', 'двух третьих'],
    [f(1, 4), 'одна четвёртая', 'одну четвёртую', 'одной четвёртой'],
    [f(3, 4), 'три четвёртых', 'три четвёртых', 'трёх четвёртых'],
    [f(1, 6), 'одна шестая', 'одну шестую', 'одной шестой'],
    [f(5, 6), 'пять шестых', 'пять шестых', 'пяти шестых'],
    [f(3, 8), 'три восьмых', 'три восьмых', 'трёх восьмых'],
    [f(4, 4), 'целая', 'целую', 'целой'],
  ])('%o → %s / %s / %s', (fr, nom, acc, gen) => {
    expect(words(fr)).toBe(nom);
    expect(words(fr, 'acc')).toBe(acc);
    expect(words(fr, 'gen')).toBe(gen);
  });
});

describe('arithmetic', () => {
  it('simplifies', () => expect(simplify(f(4, 6))).toEqual(f(2, 3)));
  it('compares', () => {
    expect(compare(f(1, 3), f(1, 6))).toBe(1);
    expect(compare(f(1, 6), f(1, 2))).toBe(-1);
    expect(compare(f(2, 3), f(4, 6))).toBe(0);
  });
  it('checks equal value', () => expect(sameValue(f(3, 6), f(1, 2))).toBe(true));
  it('takes a part of a part', () => {
    expect(mul(f(1, 2), f(1, 2))).toEqual(f(1, 4));
    expect(mul(f(2, 3), f(1, 2))).toEqual(f(1, 3));
    expect(mul(f(1, 2), f(3, 4))).toEqual(f(3, 8));
  });
});
