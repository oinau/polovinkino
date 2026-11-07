import { describe, expect, it } from 'vitest';
import { allPhrases } from '../../src/phrases';
import { HEROES, orderLine } from '../../src/lines';
import { normalizePhrase, phraseKey } from '../../src/voicekey';

const phrases = allPhrases();

describe('spoken phrases', () => {
  it('exist', () => expect(phrases.length).toBeGreaterThan(50));

  it('never contain digit fractions (TTS reads «3/4» as «три четыре»)', () => {
    const bad = phrases.filter(p => /\d+\s*\/\s*\d+/.test(p.text)).map(p => p.text);
    expect(bad).toEqual([]);
  });

  it('never put the digits 1 or 2 before a noun (TTS says «один кучка», «два части»)', () => {
    const bad = phrases.filter(p => /(^|[^\d])[12][\s\u00A0]+[а-яё]/i.test(p.text)).map(p => p.text);
    expect(bad).toEqual([]);
  });

  it('have unique keys', () => {
    expect(new Set(phrases.map(p => p.key)).size).toBe(phrases.length);
  });

  it('include every hero introduction', () => {
    for (const h of Object.values(HEROES)) expect(phrases.some(p => p.text === h.intro)).toBe(true);
  });
});

describe('phrase keys', () => {
  // Recordings are stored under these keys: changing the hash would orphan every recording.
  it('are stable', () => {
    expect(phraseKey('Вот уважил старика!')).toBe('5c6f5a79');
    expect(phraseKey('Мне две третьих пиццы!')).toBe('6b13938f');
  });

  it('ignore quotes and spacing', () => {
    expect(normalizePhrase('  «Екібас»   по-казахски ')).toBe('Екібас по-казахски');
    expect(phraseKey('«А»  б')).toBe(phraseKey('А б'));
  });
});

describe('order lines', () => {
  it('say fractions in the accusative', () => {
    expect(orderLine('borovik', { n: 1, d: 3 })).toBe('Дружок, отрежь-ка мне одну третью пиццы.');
    expect(orderLine('ekibas', { n: 1, d: 2 }, { n: 1, d: 2 })).toBe('На доске половина пиццы. Мне половину от этого куска!');
  });
});
