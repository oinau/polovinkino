// Every phrase the game can say aloud, generated from the level data, for the voice studio.
import { GNOME_LEVELS, PIZZA_LEVELS } from './levels';
import { GNOME_NOTES, HEROES, LINES, PIZZA_NOTES, REACTIONS, explainDispute, gnomeClaims, orderLine } from './lines';
import { phraseKey } from './voicekey';

export type Speaker = 'narrator' | 'ekibas' | 'osya' | 'borovik' | 'usach' | 'ochkarik';

export const SPEAKERS: Record<Speaker, { name: string; color: string; rate: number }> = {
  narrator: { name: 'Ведущий', color: '#2E3A59', rate: 1 },
  ekibas: { name: 'Екибас', color: '#8A9A5B', rate: 1 },
  osya: { name: 'Осьминожка Ося', color: '#D9734E', rate: 1.15 },
  borovik: { name: 'Дед Боровик', color: '#6E7C45', rate: 0.85 },
  usach: { name: 'Гном Усач', color: '#B9553A', rate: 1.25 },
  ochkarik: { name: 'Гном Очкарик', color: '#5F6E3A', rate: 1.3 },
};

export interface Phrase {
  key: string;
  text: string;
  speaker: Speaker;
  /** Where it is heard, e.g. «Пиццерия, смена 2». */
  where: string;
}

export function allPhrases(): Phrase[] {
  const list: Phrase[] = [];
  const seen = new Set<string>();
  const add = (text: string, speaker: Speaker, where: string) => {
    const key = phraseKey(text);
    if (!text || seen.has(key)) return;
    seen.add(key);
    list.push({ key, text, speaker, where });
  };

  for (const h of Object.values(HEROES)) add(h.intro, 'narrator', `Знакомство: ${h.name}`);

  PIZZA_LEVELS.forEach((lv, i) => {
    const where = `Пиццерия, смена ${i + 1}`;
    add(lv.intro, 'narrator', `${where}, вступление`);
    for (const o of lv.orders) {
      if (o.who === 'tikhon') continue; // Tikhon only holds up signs
      add(orderLine(o.who, o.want, o.of), o.who, `${where}, заказ`);
    }
  });
  for (const who of ['ekibas', 'osya', 'borovik'] as const) {
    for (const r of REACTIONS) add(LINES[who][r], who, 'Пиццерия, реакция клиента');
  }
  PIZZA_NOTES.slice(1).forEach(n => add(n, 'narrator', 'Пиццерия, итог смены'));

  GNOME_LEVELS.forEach((lv, i) => {
    const where = `Гномы, спор ${i + 1}`;
    add(lv.intro, 'narrator', `${where}, вступление`);
    for (const d of lv.rounds) {
      const claims = gnomeClaims(d);
      add(claims.usach, 'usach', where);
      add(claims.ochkarik, 'ochkarik', where);
      const why = explainDispute(d, true);
      add(`Верно! ${why}`, 'narrator', `${where}, верный ответ`);
      add(why, 'narrator', `${where}, ошибка`);
    }
  });
  GNOME_NOTES.slice(1).forEach(n => add(n, 'narrator', 'Гномы, итог'));

  return list;
}
