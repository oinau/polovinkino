import { describe, expect, it } from 'vitest';
import { ACUTE, STRESSED, forSpeech, markStress } from '../../src/pronounce/dictionary';

describe('speech dictionary', () => {
  it.each(STRESSED)('%s: the stress mark follows a vowel', form => {
    expect(form.match(/'/g)).toHaveLength(1);
    expect('аеёиоуыэюя').toContain(form[form.indexOf("'") - 1].toLowerCase());
  });

  it('always respells «пицца» as heard', () => {
    expect(forSpeech('Мне две третьих пиццы! Пиццерия «Кусочек».', 'none')).toBe('Мне две третьих пицы! Пицерия «Кусочек».');
  });

  it('marks stress only when asked, on whole words, in any case at the start', () => {
    expect(forSpeech('Это Екибас и Цапля.', 'none')).toBe('Это Екибас и Цапля.');
    expect(forSpeech('Это Екибас и Цапля.', 'acute')).toBe(`Это Екиба${ACUTE}с и Ца${ACUTE}пля.`);
    expect(forSpeech('Кучки у Боровика.', 'caps')).toBe('КУчки у БоровикА.');
    // Not inside other words: «тихонько» is not «Тихон».
    expect(forSpeech('тихонько', 'caps')).toBe('тихонько');
    expect(markStress("до'мика", 'caps')).toBe('дОмика');
  });
});
