// Everything the characters say. Kept apart from the scenes so the voice studio
// can list every spoken phrase for recording.
import type { CustomerId } from './art';
import type { Dispute } from './levels';
import { capitalize, compare, str, words, type Frac } from './fractions';

// ---------- pizzeria ----------
export type Reaction = 'happy' | 'little' | 'much' | 'leave';
export const REACTIONS: Reaction[] = ['happy', 'little', 'much', 'leave'];

export interface Lines extends Record<Reaction, string> {
  order: (w: string) => string;
  /** Order for a part of a part: «на доске половина пиццы, мне половину от этого куска». */
  orderOf: (w: string, of: string) => string;
  /** Second head's remarks: shown in a small bubble, never read aloud. */
  side?: Record<Reaction, string> & { order: string[] };
}

export const LINES: Record<CustomerId, Lines> = {
  ekibas: {
    order: w => `Мне ${w} пиццы!`,
    orderOf: (w, of) => `На доске ${of} пиццы. Мне ${w} от этого куска!`,
    happy: 'Вот это сервис! Обе головы довольны.',
    little: 'Маловато! Голов-то у меня две.',
    much: 'Многовато! Одна голова на диете!',
    leave: 'Всё, уходим! Обе головы обиделись.',
    side: {
      order: [
        'А мне ничего. Я на диете. Наверное.',
        'А мне только корочку. Я на диете.',
        'Мне не надо! …Ну, может, кусочек.',
        '«Екібас» по-казахски — «две головы»!',
      ],
      happy: 'Ладно, диета с понедельника!',
      little: 'Я же говорил: надо было и мне заказать.',
      much: 'Столько? Я же на диете!',
      leave: 'Ну и ладно. Я всё равно на диете.',
    },
  },
  osya: {
    order: w => `${capitalize(w)} пиццы, пожалуйста! Щупальца уже урчат.`,
    orderOf: (w, of) => `Ой, тут ${of} пиццы? Тогда ${w} от этого куска, пожалуйста!`,
    happy: 'Ура! Все восемь щупалец довольны!',
    little: 'Ой, маловато…',
    much: 'Ой, столько я не съем!',
    leave: 'Пойду лучше рыбку поймаю…',
  },
  // Tikhon never speaks: his lines are shown on a sign.
  tikhon: {
    order: () => '',
    orderOf: () => '',
    happy: 'СПАСИБО!',
    little: 'МАЛО!',
    much: 'МНОГО!',
    leave: 'УХОЖУ.',
  },
  borovik: {
    order: w => `Дружок, отрежь-ка мне ${w} пиццы.`,
    orderOf: (w, of) => `Дружок, на доске ${of} пиццы. Отрежь-ка мне ${w} от этого куска.`,
    happy: 'Вот уважил старика!',
    little: 'Эх, маловато будет.',
    much: 'Куда мне столько, дружок?',
    leave: 'Пойду-ка я домой, вздремну…',
  },
};

export const orderLine = (who: CustomerId, want: Frac, of?: Frac) =>
  of ? LINES[who].orderOf(words(want, 'acc'), words(of)) : LINES[who].order(words(want, 'acc'));

/** Result-screen notes by stars (index 1..3). */
export const PIZZA_NOTES = ['', 'Смена пройдена! Попробуй ещё раз без ошибок.', 'Хорошая смена! Почти без ошибок.', 'Идеальная смена! Ни одной ошибки!'];
export const GNOME_NOTES = ['', 'Споры разобраны! Попробуй ещё раз без ошибок.', 'Хороший судья! Почти без ошибок.', 'Самый справедливый судья в Половинкино!'];

// ---------- gnomes ----------
export type Gnome = 'usach' | 'ochkarik';
export type Truth = Gnome | 'equal';

export const GNOME_NAMES: Record<Gnome, { name: string; gen: string }> = {
  usach: { name: 'Усач', gen: 'Усача' },
  ochkarik: { name: 'Очкарик', gen: 'Очкарика' },
};

export function truthOf({ usach, ochkarik }: Dispute): Truth {
  const cmp = compare(usach, ochkarik);
  return cmp > 0 ? 'usach' : cmp < 0 ? 'ochkarik' : 'equal';
}

/** What each gnome claims. Ochkarik voices the classic trap when it fits: «6 больше 3, значит, мне больше». */
export function gnomeClaims({ usach, ochkarik }: Dispute): Record<Gnome, string> {
  const trap = usach.n === 1 && ochkarik.n === 1 && ochkarik.d > usach.d;
  return {
    usach: `У меня ${words(usach)} пирога!`,
    ochkarik: trap
      ? `А у меня ${words(ochkarik)}! ${ochkarik.d} больше, чем ${usach.d}, значит, мне больше!`
      : `А у меня ${words(ochkarik)}! Мне больше!`,
  };
}

/** Written with digits for the screen; spoken in words, since TTS reads «3/4» as «три четыре». */
export function explainDispute(d: Dispute, spoken = false) {
  const { usach, ochkarik } = d;
  const truth = truthOf(d);
  const nom = (f: Frac) => (spoken ? words(f) : str(f));
  const gen = (f: Frac) => (spoken ? words(f, 'gen') : str(f));
  if (truth === 'equal') return `${capitalize(nom(usach))} и ${nom(ochkarik)} — это поровну. Полоски одной длины!`;
  const big = d[truth];
  const small = truth === 'usach' ? ochkarik : usach;
  const name = GNOME_NAMES[truth].gen;
  if (big.d === small.d) return `Кусочки одинаковые, а у ${name} их больше: ${nom(big)} больше ${gen(small)}.`;
  if (big.n === 1 && small.n === 1) {
    return `Чем на больше частей делим, тем меньше кусочек. ${capitalize(nom(small))} меньше ${gen(big)}.`;
  }
  return `Посмотри на полоски: у ${name} длиннее. ${capitalize(nom(big))} больше ${gen(small)}.`;
}

export const VOICE_SAMPLE = 'Привет! Я буду читать заказы. Мне две третьих пиццы!';

// ---------- heroes: name tags and the one-time introduction card ----------
export type HeroId = CustomerId | 'pyh' | 'gnomes';

export const HEROES: Record<HeroId, { name: string; tag: string; textures: string[]; intro: string }> = {
  pyh: {
    name: 'Повар Пых', tag: 'Пых', textures: ['pyh-happy'],
    intro: 'Это повар Пых — пельмень в огромном колпаке. Он режет пиццу ровнее всех в Половинкино, а ты ему помогаешь.',
  },
  ekibas: {
    name: 'Екибас', tag: 'Екибас', textures: ['ekibas-normal'],
    intro: 'Это Екибас. У него две головы, и они никогда не договорятся. Его имя по-казахски так и значит — «две головы».',
  },
  osya: {
    name: 'Осьминожка Ося', tag: 'Ося', textures: ['osya-happy'],
    intro: 'Это осьминожка Ося. Обожает пиццу и вечно сбивается, когда считает свои щупальца.',
  },
  tikhon: {
    name: 'Носок Тихон', tag: 'Тихон', textures: ['tikhon-normal'],
    intro: 'Это носок Тихон. Он никогда не разговаривает, а показывает табличку. Говорят, он ищет свою пару…',
  },
  borovik: {
    name: 'Дед Боровик', tag: 'Дед Боровик', textures: ['borovik-happy'],
    intro: 'Это дед Боровик, самый старый гриб в Половинкино. Терпеливый, но любит поворчать.',
  },
  gnomes: {
    name: 'Усач и Очкарик', tag: '', textures: ['usach-happy', 'ochkarik-happy'],
    intro: 'Это гномы Усач и Очкарик. Они дружат с детства и спорят с утра до вечера — особенно о том, кому больше пирога.',
  },
};
