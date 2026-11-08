import type { CustomerId } from './art';
import type { Frac } from './fractions';

export interface Order {
  who: CustomerId;
  want: Frac;
  /** Pizza arrives already cut into this many parts; otherwise the player cuts it. */
  preCut?: number;
  /** Only this part of the pizza is on the board; the customer wants `want` of it («половину от половины»). */
  of?: Frac;
}

export interface PizzaLevel {
  name: string;
  intro: string;
  /** Show the step-by-step arrow. */
  guide: boolean;
  /** Seconds before a customer gives up; undefined = no hurry. */
  patience?: number;
  cuts: number[];
  orders: Order[];
}

const f = (n: number, d: number): Frac => ({ n, d });

export const PIZZA_LEVELS: PizzaLevel[] = [
  {
    name: 'Первая смена',
    intro: 'Пых уже нарезал пиццу. Отдай клиенту столько кусочков, сколько он просит.',
    guide: true,
    cuts: [],
    orders: [
      { who: 'borovik', want: f(1, 3), preCut: 3 },
      { who: 'ekibas', want: f(2, 3), preCut: 3 },
      { who: 'osya', want: f(1, 6), preCut: 6 },
      { who: 'tikhon', want: f(5, 6), preCut: 6 },
      { who: 'borovik', want: f(1, 2), preCut: 2 },
    ],
  },
  {
    name: 'Режу сам',
    intro: 'Теперь ты сам решаешь, на сколько равных частей резать пиццу.',
    guide: true,
    patience: 75,
    cuts: [2, 3, 4, 6],
    orders: [
      { who: 'ekibas', want: f(2, 3) },
      { who: 'osya', want: f(3, 4) },
      { who: 'tikhon', want: f(1, 6) },
      { who: 'borovik', want: f(1, 4) },
      { who: 'ekibas', want: f(5, 6) },
    ],
  },
  {
    name: 'Хитрые заказы',
    intro: 'Пых уже нарезал пиццу, но не так, как просят клиенты. Подумай, сколько кусочков отдать!',
    guide: false,
    patience: 60,
    cuts: [],
    orders: [
      { who: 'borovik', want: f(1, 3), preCut: 6 },
      { who: 'ekibas', want: f(2, 3), preCut: 6 },
      { who: 'osya', want: f(1, 2), preCut: 4 },
      { who: 'tikhon', want: f(1, 2), preCut: 6 },
      { who: 'ekibas', want: f(3, 4), preCut: 4 },
    ],
  },
  {
    name: 'Час пик',
    intro: 'Очередь! Клиенты торопятся, работай быстро, но аккуратно.',
    guide: false,
    patience: 35,
    cuts: [2, 3, 4, 6],
    orders: [
      { who: 'osya', want: f(2, 3) },
      { who: 'tikhon', want: f(1, 4) },
      { who: 'ekibas', want: f(5, 6) },
      { who: 'borovik', want: f(2, 6), preCut: 3 },
      { who: 'ekibas', want: f(3, 4) },
      { who: 'osya', want: f(1, 3) },
    ],
  },
  {
    name: 'Делим дальше',
    intro: 'На доске осталась только часть пиццы. Клиенты просят долю от этого куска: например, половину от половины. Сначала подумай, какая это часть всей пиццы!',
    guide: true,
    patience: 90,
    cuts: [2, 3, 4, 6, 8],
    orders: [
      { who: 'borovik', want: f(1, 2), of: f(1, 2) },
      { who: 'osya', want: f(1, 3), of: f(1, 2) },
      { who: 'ekibas', want: f(1, 2), of: f(2, 3) },
      { who: 'tikhon', want: f(1, 2), of: f(1, 3) },
      { who: 'ekibas', want: f(2, 3), of: f(1, 2) },
      { who: 'borovik', want: f(1, 2), of: f(3, 4) },
    ],
  },
];

export interface Dispute {
  usach: Frac;
  ochkarik: Frac;
}

export interface GnomeLevel {
  name: string;
  intro: string;
  /** Pies visible before answering. */
  showPies: boolean;
  rounds: Dispute[];
}

const d = (a: Frac, b: Frac): Dispute => ({ usach: a, ochkarik: b });

export const GNOME_LEVELS: GnomeLevel[] = [
  {
    name: 'Смотри и сравнивай',
    intro: 'Гномы делят пироги. Посмотри на кусочки и рассуди: у кого больше?',
    showPies: true,
    rounds: [d(f(1, 2), f(1, 3)), d(f(1, 6), f(1, 3)), d(f(1, 4), f(1, 2)), d(f(2, 6), f(5, 6)), d(f(1, 3), f(1, 4))],
  },
  {
    name: 'Только числа',
    intro: 'Пироги накрыты салфетками. Сравни дроби по числам, потом проверим!',
    showPies: false,
    rounds: [d(f(1, 3), f(1, 6)), d(f(1, 6), f(1, 2)), d(f(2, 3), f(1, 3)), d(f(3, 6), f(1, 6)), d(f(1, 4), f(1, 3))],
  },
  {
    name: 'Хитрые споры',
    intro: 'Осторожно: иногда гномы спорят зря, и у них поровну!',
    showPies: true,
    rounds: [d(f(2, 3), f(4, 6)), d(f(2, 3), f(1, 2)), d(f(1, 2), f(3, 6)), d(f(5, 6), f(2, 3)), d(f(2, 6), f(1, 3))],
  },
];

// ---------- clock square: Tikhon waits for Nosochka ----------
// Times are minutes since 12:00: 2:30 = 150.
const T = (h: number, m: number) => h * 60 + m;

export type ClockRound =
  | { kind: 'read'; t: number; options: number[] }
  | { kind: 'set'; from: number; to: number }
  | { kind: 'wait'; now: number; meet: number; options: number[] };

export interface ClockLevel {
  name: string;
  intro: string;
  guide: boolean;
  rounds: ClockRound[];
}

const WAIT_OPTIONS = [10, 15, 20, 30, 45];

export const CLOCK_LEVELS: ClockLevel[] = [
  {
    name: 'Который час?',
    intro: 'Носок Тихон ждёт Носочку у больших часов и всё время спрашивает, который час. Посмотри на стрелки и подскажи ему!',
    guide: true,
    rounds: [
      { kind: 'read', t: T(3, 0), options: [T(3, 0), T(12, 0), T(2, 30)] },
      { kind: 'read', t: T(2, 30), options: [T(1, 30), T(2, 30), T(3, 30)] },
      { kind: 'read', t: T(2, 15), options: [T(2, 15), T(1, 15), T(2, 45)] },
      { kind: 'read', t: T(2, 45), options: [T(2, 45), T(1, 45), T(2, 15)] },
      { kind: 'read', t: T(3, 30), options: [T(3, 30), T(2, 30), T(3, 0)] },
    ],
  },
  {
    name: 'Поставь стрелки',
    intro: 'Носочка пишет Тихону, во сколько придёт. Поставь стрелки на это время, чтобы Тихон не перепутал. Тяни минутную стрелку — часовая пойдёт сама.',
    guide: true,
    rounds: [
      { kind: 'set', from: T(2, 0), to: T(2, 30) },
      { kind: 'set', from: T(2, 0), to: T(2, 15) },
      { kind: 'set', from: T(2, 0), to: T(2, 45) },
      { kind: 'set', from: T(2, 30), to: T(3, 0) },
      { kind: 'set', from: T(3, 0), to: T(3, 30) },
    ],
  },
  {
    name: 'Сколько ждать?',
    intro: 'Тихон пришёл раньше. Посчитай, сколько минут ему ждать Носочку. Подсказка: четверть часа — это пятнадцать минут.',
    guide: false,
    rounds: [
      { kind: 'wait', now: T(2, 15), meet: T(2, 30), options: WAIT_OPTIONS },
      { kind: 'wait', now: T(2, 0), meet: T(2, 30), options: WAIT_OPTIONS },
      { kind: 'wait', now: T(2, 30), meet: T(2, 45), options: WAIT_OPTIONS },
      { kind: 'wait', now: T(2, 15), meet: T(3, 0), options: WAIT_OPTIONS },
      { kind: 'wait', now: T(2, 40), meet: T(3, 0), options: WAIT_OPTIONS },
    ],
  },
];

// ---------- pier: captain Sardina shares out the treasure ----------
export type CrewId = 'kok' | 'bocman' | 'shturman' | 'rumb';

export type PierRound =
  /** Deal the coins into equal piles, then give away `frac.n` piles of `frac.d`. */
  | { kind: 'deal'; who: CrewId; total: number; frac: Frac }
  /** How many coins is `frac` of `total`? */
  | { kind: 'count'; who: CrewId; total: number; frac: Frac; options: number[] }
  /** `frac` (one pile) was `part` coins: how many were in the chest? */
  | { kind: 'whole'; who: CrewId; part: number; frac: Frac; options: number[] };

export interface PierLevel {
  name: string;
  intro: string;
  /** Arrow points at the next pile while dealing; the pick hint names the number of piles. */
  guide: boolean;
  rounds: PierRound[];
}

const deal = (who: CrewId, total: number, frac: Frac): PierRound => ({ kind: 'deal', who, total, frac });

export const PIER_LEVELS: PierLevel[] = [
  {
    name: 'Раздели клад',
    intro: 'Капитан Сардина привезла сундук монет. Разложи монеты в равные кучки — по одной монете в каждую по очереди — и отдай, сколько просят.',
    guide: true,
    rounds: [deal('bocman', 6, f(1, 2)), deal('kok', 9, f(1, 3)), deal('rumb', 8, f(1, 4)), deal('shturman', 12, f(1, 3)), deal('kok', 10, f(1, 2))],
  },
  {
    name: 'Несколько кучек',
    intro: 'Теперь просят больше одной части: две третьих — это две кучки из трёх. Раздели клад и отдай нужные кучки.',
    guide: false,
    rounds: [deal('bocman', 9, f(2, 3)), deal('shturman', 8, f(3, 4)), deal('kok', 12, f(2, 3)), deal('bocman', 12, f(3, 4)), deal('rumb', 12, f(5, 6))],
  },
  {
    name: 'В уме',
    intro: 'Монеты раскладывать не надо: посчитай в уме и выбери ответ. А потом проверим!',
    guide: false,
    rounds: [
      { kind: 'count', who: 'kok', total: 12, frac: f(1, 3), options: [3, 4, 6] },
      { kind: 'count', who: 'rumb', total: 12, frac: f(1, 4), options: [3, 4, 8] },
      { kind: 'count', who: 'bocman', total: 9, frac: f(2, 3), options: [3, 6, 7] },
      { kind: 'whole', who: 'shturman', part: 4, frac: f(1, 3), options: [7, 8, 12] },
      { kind: 'whole', who: 'kok', part: 5, frac: f(1, 2), options: [7, 10, 15] },
    ],
  },
];

/** Total coins in the chest and the right answer in coins. */
export function pierNumbers(r: PierRound): { total: number; pile: number; answer: number } {
  if (r.kind === 'whole') return { total: r.part * r.frac.d, pile: r.part, answer: r.part * r.frac.d };
  const pile = r.total / r.frac.d;
  return { total: r.total, pile, answer: pile * r.frac.n };
}

// ---------- doctor: heights in «houses» on the height chart ----------
export type PatientId = 'borovik' | 'tikhon' | 'ekibas' | 'pyh' | 'osya' | 'usach' | 'sardina' | 'giraffe' | 'heron';

/** Everyone's height in houses: the same in every level, so the growth wall stays consistent. */
export const HEIGHTS: Record<PatientId, Frac> = {
  usach: f(1, 6),
  borovik: f(1, 4),
  tikhon: f(1, 4),
  osya: f(1, 3),
  ekibas: f(1, 2),
  sardina: f(2, 3),
  pyh: f(3, 4),
  heron: f(1, 1),
  giraffe: f(5, 4),
};

export type DoctorRound =
  /** Set the bar to the patient's height, then measure. `h` overrides the usual height. */
  | { kind: 'set'; who: PatientId; h?: Frac }
  /** The patient stands under the bar: pick the height. */
  | { kind: 'read'; who: PatientId; options: Frac[]; h?: Frac }
  /** Tap everyone in order of height. Equal heights may go in either order. */
  | { kind: 'sort'; who: PatientId[]; order: 'asc' | 'desc' };

export interface DoctorLevel {
  name: string;
  intro: string;
  /** Divisions of one house on the chart; 0 hides them (sorting by the name tags). */
  ticks: number;
  guide: boolean;
  rounds: DoctorRound[];
}

export const DOCTOR_LEVELS: DoctorLevel[] = [
  {
    name: 'Половинки и четверти',
    intro: 'Жители пришли к доктору Цапле измерить рост. Ростомер на стене — от земли до крыши, это один домик. Опусти планку на нужную высоту и нажми «Мерить».',
    ticks: 4,
    guide: true,
    rounds: [
      { kind: 'set', who: 'borovik' },
      { kind: 'set', who: 'ekibas' },
      { kind: 'set', who: 'pyh' },
      { kind: 'read', who: 'tikhon', options: [f(1, 4), f(1, 2), f(3, 4)] },
    ],
  },
  {
    name: 'Трети и шестые',
    intro: 'Теперь домик на ростомере разделён на шесть частей. Одна третья — это сколько шестых?',
    ticks: 6,
    guide: false,
    rounds: [
      { kind: 'set', who: 'osya' },
      { kind: 'read', who: 'usach', options: [f(1, 6), f(1, 3), f(1, 2)] },
      { kind: 'set', who: 'sardina' },
      { kind: 'read', who: 'ekibas', options: [f(1, 3), f(1, 2), f(2, 3)] },
    ],
  },
  {
    name: 'Выше домика',
    intro: 'Сегодня на приём пришёл жираф. Интересно, он поместится на ростомере?',
    ticks: 4,
    guide: false,
    rounds: [
      { kind: 'set', who: 'giraffe' },
      { kind: 'set', who: 'heron' },
      { kind: 'read', who: 'giraffe', h: f(3, 2), options: [f(1, 1), f(5, 4), f(3, 2)] },
    ],
  },
  {
    name: 'Кто выше?',
    intro: 'Рост всех жителей уже записан. Расставь их по росту: нажимай на них по очереди.',
    ticks: 0,
    guide: false,
    rounds: [
      { kind: 'sort', who: ['pyh', 'borovik', 'ekibas', 'osya'], order: 'asc' },
      { kind: 'sort', who: ['sardina', 'giraffe', 'usach', 'heron'], order: 'desc' },
      { kind: 'sort', who: ['osya', 'tikhon', 'ekibas', 'borovik'], order: 'asc' },
    ],
  },
];

export const heightOf = (r: { who: PatientId; h?: Frac }) => r.h ?? HEIGHTS[r.who];

// ---------- potion shop: adding fractions with the same denominator ----------
export type IngredientId = 'frog' | 'moon' | 'pepper' | 'honey';
export const INGREDIENTS: IngredientId[] = ['frog', 'moon', 'pepper', 'honey'];

export type PotionRound =
  /** Pour each ingredient by the recipe (in 1/d portions), brew, then say how much potion there is. */
  | { kind: 'brew'; d: number; recipe: [IngredientId, number][] }
  /** The flask already holds `start`; top it up with `add` to `target`/d, then say how much was added. */
  | { kind: 'top'; d: number; start: [IngredientId, number][]; add: IngredientId; target: number };

export interface PotionLevel {
  name: string;
  intro: string;
  /** Recipe lines get a tick when poured right, and the flask shows its divisions as fractions. */
  guide: boolean;
  rounds: PotionRound[];
}

const brew = (d: number, ...recipe: [IngredientId, number][]): PotionRound => ({ kind: 'brew', d, recipe });

export const POTION_LEVELS: PotionLevel[] = [
  {
    name: 'Четвёртые',
    intro: 'Совёнок Пип учится варить зелья. Колба разделена на четыре части. Нажми на бутылку — нальётся одна часть. Налей всё по рецепту и нажми «Варить!».',
    guide: true,
    rounds: [brew(4, ['frog', 1], ['moon', 2]), brew(4, ['pepper', 2], ['honey', 1]), brew(4, ['moon', 1], ['frog', 1]), brew(4, ['honey', 1], ['pepper', 1], ['frog', 1])],
  },
  {
    name: 'Шестые',
    intro: 'Новая колба разделена на шесть частей. Рецепты сложнее!',
    guide: false,
    rounds: [brew(6, ['moon', 1], ['frog', 2]), brew(6, ['honey', 2], ['pepper', 3]), brew(6, ['frog', 3], ['moon', 1], ['honey', 1]), brew(6, ['pepper', 1], ['moon', 4])],
  },
  {
    name: 'Полная колба',
    intro: 'Эти зелья варятся в полной колбе. Сколько это — полная колба?',
    guide: false,
    rounds: [brew(4, ['frog', 1], ['honey', 3]), brew(4, ['moon', 2], ['pepper', 2]), brew(6, ['honey', 2], ['frog', 3], ['moon', 1]), brew(6, ['pepper', 3], ['moon', 3])],
  },
  {
    name: 'Сколько долить?',
    intro: 'В колбе уже что-то налито. Долей нужное, чтобы зелья стало сколько нужно.',
    guide: false,
    rounds: [
      { kind: 'top', d: 6, start: [['moon', 2]], add: 'honey', target: 5 },
      { kind: 'top', d: 4, start: [['frog', 1]], add: 'pepper', target: 4 },
      { kind: 'top', d: 6, start: [['frog', 1], ['honey', 2]], add: 'moon', target: 5 },
      { kind: 'top', d: 4, start: [['pepper', 2]], add: 'frog', target: 3 },
    ],
  },
];

/** Parts in the flask at the start, and the right answer in parts of d. */
export function potionNumbers(r: PotionRound) {
  if (r.kind === 'brew') return { start: 0, total: r.recipe.reduce((a, [, n]) => a + n, 0), answer: r.recipe.reduce((a, [, n]) => a + n, 0) };
  const start = r.start.reduce((a, [, n]) => a + n, 0);
  return { start, total: r.target, answer: r.target - start };
}

/**
 * Three options for «how much»: the right one, the classic mistake of adding the denominators too
 * (1/4 + 2/4 = 3/8), and one part more or less.
 */
export function potionOptions(r: PotionRound): Frac[] {
  const { answer, total } = potionNumbers(r);
  const parts = r.kind === 'brew' ? r.recipe.length : r.start.length + 1;
  const right = f(answer, r.d);
  const sumDen = f(r.kind === 'brew' ? answer : total, r.d * parts);
  // Brewing: one part less (or more); topping up: forgetting what was already in the flask.
  const offs = r.kind === 'brew' ? [answer - 1, answer + 1] : [total, answer + 1];
  const same = (a: Frac, b: Frac) => a.n * b.d === b.n * a.d;
  const n = offs.find(k => k > 0 && !same(f(k, r.d), right) && !same(f(k, r.d), sumDen))!;
  return [right, sumDen, f(n, r.d)];
}

// ---------- monster house: the finale, a room per topic ----------
export type MonsterId = 'mummy' | 'wolf' | 'slime' | 'spider' | 'bat';
export type MonsterRoom = 'kitchen' | 'attic' | 'cellar' | 'nursery' | 'parlor';

export type MonsterRound =
  /** Grandma's cake in `slices`: give everyone their share, then say how much is left. */
  | { kind: 'cake'; slices: number; gives: [MonsterId, number][]; options: Frac[] }
  /** A web of `sectors`, `torn` of them broken: how much is whole? Then mend it. */
  | { kind: 'web'; sectors: number; torn: number; options: Frac[] }
  /** A draught will blow out `frac` of `total` candles: how many? Then light them again. */
  | { kind: 'candles'; total: number; frac: Frac; options: number[] }
  /** The baby was `was`/d of the door tall and grew by `grew`/d: how tall now? */
  | { kind: 'grow'; d: number; was: number; grew: number; options: Frac[] }
  /** Guests come in `plus` minutes (a nice part of an hour); it is `now`. When do they come? Times as in the clock square. */
  | { kind: 'clock'; now: number; plus: number; options: number[] };

export interface MonsterLevel {
  room: MonsterRoom;
  name: string;
  intro: string;
  rounds: MonsterRound[];
}

export const MONSTER_LEVELS: MonsterLevel[] = [
  {
    room: 'kitchen',
    name: 'Кухня',
    intro: 'Бабушка-мумия испекла торт и разрезала его на восемь кусков. Раздай кусочки семье и посчитай, сколько торта осталось.',
    rounds: [
      { kind: 'cake', slices: 8, gives: [['wolf', 3], ['slime', 1]], options: [f(4, 8), f(4, 16), f(3, 8)] },
      { kind: 'cake', slices: 8, gives: [['spider', 1], ['wolf', 2], ['bat', 2]], options: [f(3, 8), f(5, 8), f(3, 24)] },
      { kind: 'cake', slices: 8, gives: [['wolf', 4], ['slime', 2]], options: [f(2, 8), f(6, 8), f(2, 16)] },
    ],
  },
  {
    room: 'attic',
    name: 'Чердак',
    intro: 'На чердаке живёт паук-аккуратист. Ночью ветер порвал его паутину. Сколько паутины осталось целой? Потом помоги её починить.',
    rounds: [
      { kind: 'web', sectors: 8, torn: 3, options: [f(5, 8), f(3, 8), f(5, 3)] },
      { kind: 'web', sectors: 6, torn: 2, options: [f(4, 6), f(2, 6), f(4, 2)] },
      { kind: 'web', sectors: 8, torn: 4, options: [f(4, 8), f(8, 4), f(3, 8)] },
    ],
  },
  {
    room: 'cellar',
    name: 'Подвал',
    intro: 'Папа-оборотень — большой и лохматый, но боится темноты. В подвале горят свечи, а из щели дует сквозняк. Сколько свечей он задует?',
    rounds: [
      { kind: 'candles', total: 12, frac: f(1, 4), options: [3, 4, 6] },
      { kind: 'candles', total: 9, frac: f(1, 3), options: [3, 6, 2] },
      { kind: 'candles', total: 12, frac: f(2, 3), options: [8, 4, 6] },
    ],
  },
  {
    room: 'nursery',
    name: 'Детская',
    intro: 'Малыш-слизень растёт не по дням, а по часам. Его рост отмечают на дверном косяке: от пола до верха двери — одна дверь.',
    rounds: [
      { kind: 'grow', d: 4, was: 1, grew: 2, options: [f(3, 4), f(3, 8), f(2, 4)] },
      { kind: 'grow', d: 4, was: 2, grew: 2, options: [f(4, 4), f(4, 8), f(3, 4)] },
      { kind: 'grow', d: 4, was: 3, grew: 2, options: [f(5, 4), f(5, 8), f(4, 4)] },
    ],
  },
  {
    room: 'parlor',
    name: 'Гостиная',
    intro: 'В гостиной большие часы, а вместо кукушки в них живёт летучая мышь. Сегодня к монстрам придут гости. Подскажи, когда!',
    rounds: [
      { kind: 'clock', now: 6 * 60 + 40, plus: 20, options: [7 * 60, 7 * 60 + 20, 6 * 60 + 50] },
      { kind: 'clock', now: 6 * 60 + 15, plus: 15, options: [6 * 60 + 30, 6 * 60 + 45, 6 * 60 + 20] },
      { kind: 'clock', now: 6 * 60, plus: 45, options: [6 * 60 + 45, 6 * 60 + 15, 7 * 60 + 45] },
    ],
  },
];

/** The right answer of a monster round: a fraction, a number of candles, or a time. */
export function monsterAnswer(r: MonsterRound): Frac | number {
  switch (r.kind) {
    case 'cake': return f(r.slices - r.gives.reduce((a, [, n]) => a + n, 0), r.slices);
    case 'web': return f(r.sectors - r.torn, r.sectors);
    case 'candles': return (r.total / r.frac.d) * r.frac.n;
    case 'grow': return f(r.was + r.grew, r.d);
    case 'clock': return r.now + r.plus;
  }
}

// ---------- beaver's bridge: planks of different lengths that close a gap exactly ----------
export interface BeaverRound {
  /** Length of the hole in the bridge, in «whole planks». */
  gap: Frac;
  /** The beaver's pile: each plank can be used once. */
  planks: Frac[];
  /** Divisions drawn under the hole; 0 means none. */
  marks: number;
}

export interface BeaverLevel {
  name: string;
  intro: string;
  rounds: BeaverRound[];
}

const ONE = f(1, 1);
const many = (n: number, p: Frac) => Array.from({ length: n }, () => p);

export const BEAVER_LEVELS: BeaverLevel[] = [
  {
    name: 'Одинаковые доски',
    intro: 'Бобр Бруно чинит мост, по которому все ходят к доктору. Дыра в мосту длиной ровно в одну целую доску. Нажимай на доски — они лягут в дыру. Закрой её без щелей!',
    rounds: [
      { gap: ONE, planks: many(6, f(1, 4)), marks: 4 },
      { gap: ONE, planks: many(4, f(1, 3)), marks: 3 },
      { gap: ONE, planks: many(3, f(1, 2)), marks: 2 },
      { gap: ONE, planks: many(7, f(1, 6)), marks: 6 },
    ],
  },
  {
    name: 'Две длины',
    intro: 'Теперь доски разной длины. Подумай, какие из них вместе дадут ровно одну целую.',
    rounds: [
      { gap: ONE, planks: [f(1, 2), ...many(4, f(1, 4))], marks: 4 },
      { gap: ONE, planks: [f(1, 3), f(1, 3), ...many(3, f(1, 6))], marks: 6 },
      { gap: ONE, planks: [f(1, 2), f(1, 2), f(1, 4), f(1, 4)], marks: 4 },
      { gap: ONE, planks: [f(1, 2), f(1, 3), ...many(3, f(1, 6))], marks: 6 },
    ],
  },
  {
    name: 'Мало досок',
    intro: 'Досок осталось мало, и делений на мосту нет. Выбери те, что закроют дыру ровно.',
    rounds: [
      { gap: ONE, planks: [f(1, 2), f(1, 3), f(1, 6), f(1, 4)], marks: 0 },
      { gap: ONE, planks: [f(1, 3), f(1, 4), f(1, 2), f(1, 4)], marks: 0 },
      { gap: ONE, planks: [f(1, 6), f(1, 2), f(1, 3), f(1, 3)], marks: 0 },
    ],
  },
  {
    name: 'Дыра поменьше',
    intro: 'Эти дыры меньше целой доски. Сначала посмотри, какой длины дыра.',
    rounds: [
      { gap: f(3, 4), planks: [f(1, 2), f(1, 4), f(1, 4), f(1, 3)], marks: 0 },
      { gap: f(2, 3), planks: [f(1, 3), f(1, 6), f(1, 6), f(1, 2)], marks: 0 },
      { gap: f(5, 6), planks: [f(1, 2), f(1, 3), f(1, 6), f(1, 4)], marks: 0 },
    ],
  },
];

// ---------- couriers: a point on the number line ----------
export type CourierClient = 'osya' | 'borovik' | 'tikhon' | 'nosochka' | 'usach' | 'sardina' | 'giraffe' | 'pip';

export interface CourierRound {
  who: CourierClient;
  /** Where the client lives, from the pizzeria (0) along the street. */
  at: Frac;
}

export interface CourierLevel {
  name: string;
  intro: string;
  /** Street length in «streets»: 1, or 2 for the long one. */
  length: number;
  /** Divisions per one street, with a house on each; 0 = no marks and no houses, judge by eye. */
  ticks: number;
  rounds: CourierRound[];
}

export const COURIER_LEVELS: CourierLevel[] = [
  {
    name: 'Четверти',
    intro: 'Ёжик Шустрик развозит пиццу на самокате. Улица от пиццерии до конца — одна целая, она разделена на равные части. Нажми «Поехали», потом «Стоп!» у нужного дома. Стрелками можно подъехать точнее.',
    length: 1,
    ticks: 4,
    rounds: [{ who: 'osya', at: f(1, 2) }, { who: 'borovik', at: f(3, 4) }, { who: 'tikhon', at: f(1, 4) }, { who: 'nosochka', at: f(2, 4) }],
  },
  {
    name: 'Шестые',
    intro: 'Теперь улица разделена на шесть частей, и домов больше.',
    length: 1,
    ticks: 6,
    rounds: [{ who: 'usach', at: f(1, 3) }, { who: 'sardina', at: f(5, 6) }, { who: 'pip', at: f(1, 6) }, { who: 'osya', at: f(4, 6) }],
  },
  {
    name: 'На глаз',
    intro: 'Делений на улице нет, домов тоже — клиенты ждут прямо на тротуаре. Останавливайся на глаз!',
    length: 1,
    ticks: 0,
    rounds: [{ who: 'borovik', at: f(1, 2) }, { who: 'tikhon', at: f(1, 4) }, { who: 'nosochka', at: f(3, 4) }, { who: 'usach', at: f(2, 3) }],
  },
  {
    name: 'Длинная улица',
    intro: 'За перекрёстком построили вторую улицу, такой же длины. Адрес дома — это сколько улиц от пиццерии, поэтому старые таблички менять не стали. Теперь до конца — две целые улицы, и некоторые клиенты живут за перекрёстком.',
    length: 2,
    ticks: 4,
    rounds: [{ who: 'giraffe', at: f(5, 4) }, { who: 'pip', at: f(3, 2) }, { who: 'sardina', at: f(7, 4) }, { who: 'osya', at: f(1, 2) }],
  },
];

/** How close to the client counts as «there», in streets: exact on marks, generous by eye. */
export const courierTolerance = (lv: CourierLevel) => (lv.ticks ? 1 / 48 + 1e-9 : 1 / 12 + 1e-9);
