// Clock time in Russian words. Time is minutes since 12:00 (0..719); minutes are multiples of 5.

/** «ровно три», «без четверти три» */
const HOUR_NOM: Record<number, string> = {
  1: 'час', 2: 'два', 3: 'три', 4: 'четыре', 5: 'пять', 6: 'шесть', 7: 'семь', 8: 'восемь', 9: 'девять', 10: 'десять', 11: 'одиннадцать', 12: 'двенадцать',
};
/** «половина третьего» — the hour that is running */
const HOUR_ORD_GEN: Record<number, string> = {
  1: 'первого', 2: 'второго', 3: 'третьего', 4: 'четвёртого', 5: 'пятого', 6: 'шестого', 7: 'седьмого', 8: 'восьмого', 9: 'девятого', 10: 'десятого', 11: 'одиннадцатого', 12: 'двенадцатого',
};
/** «стрелка на трёх» */
const NUM_PREP: Record<number, string> = {
  1: 'единице', 2: 'двух', 3: 'трёх', 4: 'четырёх', 5: 'пяти', 6: 'шести', 7: 'семи', 8: 'восьми', 9: 'девяти', 10: 'десяти', 11: 'одиннадцати', 12: 'двенадцати',
};
/** «между двумя и тремя» */
const NUM_INSTR: Record<number, string> = {
  1: 'одним', 2: 'двумя', 3: 'тремя', 4: 'четырьмя', 5: 'пятью', 6: 'шестью', 7: 'семью', 8: 'восемью', 9: 'девятью', 10: 'десятью', 11: 'одиннадцатью', 12: 'двенадцатью',
};
const MIN_NOM: Record<number, string> = { 5: 'пять', 10: 'десять', 20: 'двадцать', 25: 'двадцать пять' };
const MIN_GEN: Record<number, string> = { 5: 'пяти', 10: 'десяти', 20: 'двадцати', 25: 'двадцати пяти' };

const norm = (t: number) => ((t % 720) + 720) % 720;
export const hourOf = (t: number) => Math.floor(norm(t) / 60) || 12;
export const minuteOf = (t: number) => norm(t) % 60;
const nextHour = (h: number) => (h % 12) + 1;

/** «2:30» */
export const digital = (t: number) => `${hourOf(t)}:${String(minuteOf(t)).padStart(2, '0')}`;

/** «половина третьего», «без четверти три», «ровно три», «двадцать минут третьего» */
export function timeWords(t: number): string {
  const h = hourOf(t), m = minuteOf(t), n = nextHour(h);
  if (m === 0) return `ровно ${HOUR_NOM[h]}`;
  if (m === 15) return `четверть ${HOUR_ORD_GEN[n]}`;
  if (m === 30) return `половина ${HOUR_ORD_GEN[n]}`;
  if (m === 45) return `без четверти ${HOUR_NOM[n]}`;
  if (m < 30) return `${MIN_NOM[m]} минут ${HOUR_ORD_GEN[n]}`;
  return `без ${MIN_GEN[60 - m]} ${HOUR_NOM[n]}`;
}

/** «в половину третьего», «без четверти три», «ровно в три» — after «Встретимся…» */
export function meetWords(t: number): string {
  const h = hourOf(t), m = minuteOf(t), n = nextHour(h);
  if (m === 0) return `ровно в ${HOUR_NOM[h]}`;
  if (m === 15) return `в четверть ${HOUR_ORD_GEN[n]}`;
  if (m === 30) return `в половину ${HOUR_ORD_GEN[n]}`;
  if (m < 30) return `в ${MIN_NOM[m]} минут ${HOUR_ORD_GEN[n]}`;
  return timeWords(t);
}

/** «пятнадцать минут» */
export function minutesWords(m: number): string {
  const w: Record<number, string> = {
    5: 'пять', 10: 'десять', 15: 'пятнадцать', 20: 'двадцать', 25: 'двадцать пять', 30: 'тридцать',
    35: 'тридцать пять', 40: 'сорок', 45: 'сорок пять', 50: 'пятьдесят', 55: 'пятьдесят пять', 60: 'шестьдесят',
  };
  return `${w[m] ?? m} минут`;
}

/** Minutes as a part of an hour, when it is a nice fraction: 15 → «четверть часа», 1/4. */
export function hourPart(m: number): { words: string; n: number; d: number } | null {
  const parts: Record<number, [string, number, number]> = {
    10: ['одна шестая часа', 1, 6],
    15: ['четверть часа', 1, 4],
    20: ['треть часа', 1, 3],
    30: ['полчаса', 1, 2],
    40: ['две трети часа', 2, 3],
    45: ['три четверти часа', 3, 4],
  };
  const p = parts[m];
  return p ? { words: p[0], n: p[1], d: p[2] } : null;
}

/** Why the clock shows this time, in words: for the explanation after a wrong answer. */
export function explainTime(t: number): string {
  const h = hourOf(t), m = minuteOf(t), n = nextHour(h);
  const mark = m === 0 ? 12 : m / 5;
  if (m === 0) return `Минутная стрелка на двенадцати, часовая на ${NUM_PREP[h]}. Значит, ${timeWords(t)}.`;
  const passed = m === 30 ? 'прошло полчаса' : m === 15 ? 'прошла четверть часа' : m === 45 ? 'до следующего часа осталась четверть часа'
    : m < 30 ? `прошло ${minutesWords(m)}` : `до следующего часа осталось ${minutesWords(60 - m)}`;
  return `Минутная стрелка на ${NUM_PREP[mark]}: ${passed}. Часовая между ${NUM_INSTR[h]} и ${NUM_INSTR[n]}. Значит, ${timeWords(t)}.`;
}

/** Where the minute hand must point: «на шести». */
export const minuteMark = (t: number) => NUM_PREP[minuteOf(t) === 0 ? 12 : minuteOf(t) / 5];
