import { describe, expect, it } from 'vitest';
import { ACUTE, SAMPLES, VOWELS, variant } from '../../src/pronounce/samples';

describe('pronunciation samples', () => {
  it.each(SAMPLES)('$text: every stress mark lands on a vowel', s => {
    expect(s.stress?.length, 'phrases stress the same words as the list').toBeGreaterThan(0);
    for (const i of s.stress!) expect(VOWELS).toContain(s.text[i]);
  });

  it('builds the variants', () => {
    const pizza = SAMPLES.find(s => s.text === 'пицца')!;
    expect(variant(pizza, 'acute')).toBe(`пи${ACUTE}цца`);
    expect(variant(pizza, 'caps')).toBe('пИцца');
    expect(variant(pizza, 'respell')).toBe('пица');
    const phrase = SAMPLES.find(s => s.text === 'Мне две третьих пиццы!')!;
    expect(variant(phrase, 'caps')).toBe('Мне две трЕтьих пИццы!');
  });
});
