// Every phrase the game can say aloud, generated from the level data, for the voice studio.
import { CLOCK_LEVELS, DOCTOR_LEVELS, GNOME_LEVELS, HEIGHTS, PIER_LEVELS, PIZZA_LEVELS, POTION_LEVELS, heightOf } from './levels';
import {
  CLOCK_ASK, CLOCK_FINALE, CLOCK_NOTES, GNOME_NOTES, HEROES, LINES, PIZZA_NOTES, REACTIONS, clockLetter, clockSetExplain,
  clockWaitAsk, clockWaitExplain, DOCTOR_LINES, DOCTOR_NOTES, PATIENTS, doctorExplain, doctorReadAsk, doctorSetAsk, doctorSortAsk,
  doctorSortExplain, explainDispute, POTION_GAGS, POTION_LINES, POTION_NOTES, potionAsk, potionDenominatorHint, potionExplain,
  potionQuestion, gnomeClaims, orderLine, PIER_LINES, PIER_NOTES, pierAsk, pierExplain,
} from './lines';
import { explainTime, timeWords } from './time';
import { capitalize } from './fractions';
import { phraseKey } from './voicekey';

export type Speaker = 'narrator' | 'ekibas' | 'osya' | 'borovik' | 'usach' | 'ochkarik' | 'sardina' | 'rumb' | 'heron' | 'giraffe' | 'pip';

export const SPEAKERS: Record<Speaker, { name: string; color: string; rate: number }> = {
  narrator: { name: 'Ведущий', color: '#2E3A59', rate: 1 },
  ekibas: { name: 'Екибас', color: '#8A9A5B', rate: 1 },
  osya: { name: 'Осьминожка Ося', color: '#D9734E', rate: 1.15 },
  borovik: { name: 'Дед Боровик', color: '#6E7C45', rate: 0.85 },
  usach: { name: 'Гном Усач', color: '#B9553A', rate: 1.25 },
  ochkarik: { name: 'Гном Очкарик', color: '#5F6E3A', rate: 1.3 },
  sardina: { name: 'Капитан Сардина', color: '#5E8A93', rate: 1 },
  rumb: { name: 'Попугай Румб', color: '#D9734E', rate: 1.35 },
  heron: { name: 'Доктор Цапля', color: '#2E3A59', rate: 1 },
  giraffe: { name: 'Жираф Жорж', color: '#C9973A', rate: 0.9 },
  pip: { name: 'Совёнок Пип', color: '#D9734E', rate: 1.2 },
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

  add(CLOCK_ASK, 'narrator', 'Часы, вопрос Тихона');
  add('Посмотри на зелёную дугу: каждое деление — 5 минут. Посчитай!', 'narrator', 'Часы, подсказка');
  CLOCK_LEVELS.forEach((lv, i) => {
    const where = `Часы, уровень ${i + 1}`;
    add(lv.intro, 'narrator', `${where}, вступление`);
    for (const r of lv.rounds) {
      if (r.kind === 'read') {
        add(`Верно! ${capitalize(timeWords(r.t))}.`, 'narrator', `${where}, верный ответ`);
        add(explainTime(r.t), 'narrator', `${where}, ошибка`);
      } else if (r.kind === 'set') {
        add(clockLetter(r.to), 'narrator', `${where}, письмо Носочки`);
        add(`Верно! ${capitalize(timeWords(r.to))}.`, 'narrator', `${where}, верный ответ`);
        add(clockSetExplain(r.to), 'narrator', `${where}, ошибка`);
      } else {
        add(clockWaitAsk(r.now, r.meet), 'narrator', `${where}, вопрос`);
        add(`Верно! ${clockWaitExplain(r.now, r.meet)}`, 'narrator', `${where}, верный ответ`);
        add(clockWaitExplain(r.now, r.meet), 'narrator', `${where}, ошибка`);
      }
    }
  });
  add(CLOCK_FINALE, 'narrator', 'Часы, Носочка пришла');
  CLOCK_NOTES.slice(1).forEach(n => add(n, 'narrator', 'Часы, итог'));

  PIER_LEVELS.forEach((lv, i) => {
    const where = `Пристань, уровень ${i + 1}`;
    add(lv.intro, 'narrator', `${where}, вступление`);
    for (const r of lv.rounds) {
      add(pierAsk(r), 'sardina', `${where}, просьба капитана`);
      add(`Верно! ${pierExplain(r, true)}`, 'narrator', `${where}, верный ответ`);
      if (r.kind !== 'deal') add(pierExplain(r, true), 'narrator', `${where}, ошибка`);
    }
  });
  add(PIER_LINES.uneven, 'rumb', 'Пристань, кучки разные');
  add(PIER_LINES.unevenHint, 'narrator', 'Пристань, кучки разные');
  add(PIER_LINES.many, 'rumb', 'Пристань, отдали много');
  add(PIER_LINES.right, 'rumb', 'Пристань, верно');
  add(PIER_LINES.few, 'sardina', 'Пристань, отдали мало');
  PIER_NOTES.slice(1).forEach(n => add(n, 'narrator', 'Пристань, итог'));

  DOCTOR_LEVELS.forEach((lv, i) => {
    const where = `Доктор, уровень ${i + 1}`;
    add(lv.intro, 'narrator', `${where}, вступление`);
    for (const r of lv.rounds) {
      if (r.kind === 'sort') {
        add(doctorSortAsk(r.order), 'heron', `${where}, задание`);
        add(r.order === 'asc' ? 'Верно! От самого низкого до самого высокого.' : 'Верно! От самого высокого до самого низкого.', 'narrator', `${where}, верно`);
        for (const a of r.who) for (const b of r.who) {
          if (HEIGHTS[a].n * HEIGHTS[b].d !== HEIGHTS[b].n * HEIGHTS[a].d) add(doctorSortExplain(a, b, r.order, true), 'narrator', `${where}, ошибка`);
        }
        continue;
      }
      const h = heightOf(r);
      const stretched = h.n * HEIGHTS[r.who].d !== HEIGHTS[r.who].n * h.d;
      add(r.kind === 'set' ? doctorSetAsk(r.who, h) : doctorReadAsk(r.who, stretched), 'heron', `${where}, задание`);
      const why = doctorExplain(h, lv.ticks, true);
      add(why, 'narrator', `${where}, ошибка`);
      add(`Верно! ${why}`, 'narrator', `${where}, верно`);
      for (const other of Object.keys(PATIENTS) as (keyof typeof PATIENTS)[]) {
        if (other !== r.who && HEIGHTS[other].n * h.d === h.n * HEIGHTS[other].d) add(`Верно! ${why} ${DOCTOR_LINES.same(other)}`, 'narrator', `${where}, верно (одинаковый рост)`);
      }
    }
  });
  add(DOCTOR_LINES.bonk, 'narrator', 'Доктор, планка низко');
  add(DOCTOR_LINES.gap, 'heron', 'Доктор, планка высоко');
  add(DOCTOR_LINES.giraffeWow, 'giraffe', 'Доктор, жираф не влез');
  add(DOCTOR_LINES.extend, 'heron', 'Доктор, жираф не влез');
  add(DOCTOR_LINES.stretch, 'giraffe', 'Доктор, жираф вытягивает шею');
  DOCTOR_NOTES.slice(1).forEach(n => add(n, 'narrator', 'Доктор, итог'));

  POTION_LEVELS.forEach((lv, i) => {
    const where = `Зельеварня, уровень ${i + 1}`;
    add(lv.intro, 'narrator', `${where}, вступление`);
    for (const r of lv.rounds) {
      add(potionAsk(r), 'pip', `${where}, рецепт`);
      add(potionQuestion(r), 'narrator', `${where}, вопрос`);
      add(potionExplain(r, true), 'narrator', `${where}, ошибка`);
      add(`Верно! ${potionExplain(r, true)}`, 'narrator', `${where}, верно`);
      add(potionDenominatorHint(r.d), 'narrator', `${where}, сложили знаменатели`);
    }
  });
  for (const line of Object.values(POTION_LINES)) add(line, 'pip', 'Зельеварня');
  for (const g of POTION_GAGS) add(g.line, 'narrator', 'Зельеварня, превращение');
  POTION_NOTES.slice(1).forEach(n => add(n, 'narrator', 'Зельеварня, итог'));

  return list;
}
