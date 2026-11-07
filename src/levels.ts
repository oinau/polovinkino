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
    showPies: false,
    rounds: [d(f(2, 3), f(4, 6)), d(f(2, 3), f(1, 2)), d(f(1, 2), f(3, 6)), d(f(5, 6), f(2, 3)), d(f(2, 6), f(1, 3))],
  },
];
