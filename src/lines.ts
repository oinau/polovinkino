// Everything the characters say. Kept apart from the scenes so the voice studio
// can list every spoken phrase for recording.
import type { CustomerId } from './art';
import { HEIGHTS, monsterAnswer, type CourierClient, type CourierLevel, pierNumbers, potionNumbers, type CrewId, type MonsterId, type MonsterRound, type Dispute, type IngredientId, type PatientId, type PierRound, type PotionRound } from './levels';
import { capitalize, compare, gcd, str, words, type Frac } from './fractions';
import { digital, hourPart, meetWords, minuteMark, minutesWords, timeWords } from './time';

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
export type HeroId = CustomerId | 'pyh' | 'gnomes' | 'nosochka' | 'pier' | 'heron' | 'giraffe' | 'pip' | 'monsters' | 'bruno' | 'shustrik';

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
  nosochka: {
    name: 'Носочка', tag: 'Носочка', textures: ['nosochka-happy'],
    intro: 'Это Носочка — пара Тихона. Она любит бантики и всегда приходит вовремя. Наконец-то они снова вместе!',
  },
  pier: {
    name: 'Капитан Сардина и попугай Румб', tag: '', textures: ['sardina-happy', 'rumb-happy'],
    intro: 'Это капитан Сардина и её попугай Румб. Они привезли из плавания сундук монет. Помоги поделить клад честно, чтобы никто в команде не обиделся!',
  },
  heron: {
    name: 'Доктор Цапля', tag: 'Доктор Цапля', textures: ['heron-happy'],
    intro: 'Это доктор Цапля. У неё длинные ноги, длинный клюв и самый точный ростомер в Половинкино. Рост здесь меряют в домиках!',
  },
  giraffe: {
    name: 'Жираф Жорж', tag: 'Жорж', textures: ['giraffe-happy'],
    intro: 'Это жираф Жорж. Он приехал в Половинкино недавно и ещё не знает, что он самый высокий в городе.',
  },
  pip: {
    name: 'Совёнок Пип', tag: 'Пип', textures: ['pip-happy'],
    intro: 'Это совёнок Пип, ученик волшебника. Колпак ему пока велик, а зелья иногда взрываются. Помоги ему варить точно по рецепту!',
  },
  shustrik: {
    name: 'Ёжик Шустрик', tag: 'Шустрик', textures: ['shustrik-happy'],
    intro: 'Это ёжик Шустрик, самый быстрый курьер Половинкино. Он развозит пиццу на самокате, но иногда проезжает мимо нужного дома. Помоги ему!',
  },
  bruno: {
    name: 'Бобр Бруно', tag: 'Бруно', textures: ['bruno-happy'],
    intro: 'Это бобр Бруно, лучший строитель в Половинкино. Он чинит мост через реку, но доски у него все разной длины. Помоги ему!',
  },
  monsters: {
    name: 'Семейка монстров', tag: '', textures: ['mummy-happy', 'wolf-happy', 'slime-happy', 'spider-happy', 'bat-happy'],
    intro: 'Это семейка монстров: бабушка-мумия, папа-оборотень, малыш-слизень, паук-аккуратист и летучая мышь из часов. Они совсем не страшные и очень любят гостей!',
  },
  gnomes: {
    name: 'Усач и Очкарик', tag: '', textures: ['usach-happy', 'ochkarik-happy'],
    intro: 'Это гномы Усач и Очкарик. Они дружат с детства и спорят с утра до вечера — особенно о том, кому больше пирога.',
  },
};

// ---------- clock square ----------
export const CLOCK_ASK = 'Тихон спрашивает: который час?';
export const CLOCK_SET_HINT = 'Тяни минутную стрелку.';
export const CLOCK_FINALE = 'Носочка пришла! Тихон и Носочка снова вместе.';
export const CLOCK_NOTES = ['', 'Встреча состоялась! Попробуй ещё раз без ошибок.', 'Почти без ошибок! Тихон очень благодарен.', 'Ни одной ошибки! Тихон пришёл минута в минуту.'];

export const clockLetter = (to: number) => `Носочка пишет: «Встретимся ${meetWords(to)}».`;
export const clockSetExplain = (to: number) => `Нужно ${timeWords(to)}: минутная стрелка должна смотреть на ${minuteMark(to)}.`;
export const clockWaitAsk = (now: number, meet: number) => `Сейчас ${timeWords(now)}. Встреча ${meetWords(meet)}. Сколько минут ждать?`;

export function clockWaitExplain(now: number, meet: number) {
  const diff = meet - now;
  const part = hourPart(diff);
  return `Сейчас ${timeWords(now)}, встреча ${meetWords(meet)}: ждать ${minutesWords(diff)}.${part ? ` Это ${part.words}.` : ''}`;
}

// ---------- pier ----------
export const CREW: Record<CrewId, { name: string; dat: string }> = {
  kok: { name: 'Кок', dat: 'коку' },
  bocman: { name: 'Боцман', dat: 'боцману' },
  shturman: { name: 'Штурман', dat: 'штурману' },
  rumb: { name: 'Румб', dat: 'попугаю Румбу' },
};

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
// A no-break space keeps «4 монеты» on one line in the bubbles.
// Speech gets numbers in words: TTS reads «1 кучка» as «один кучка». All our nouns are feminine.
const FEM: Record<number, string> = {
  1: 'одна', 2: 'две', 3: 'три', 4: 'четыре', 5: 'пять', 6: 'шесть', 7: 'семь', 8: 'восемь', 9: 'девять', 10: 'десять',
  11: 'одиннадцать', 12: 'двенадцать', 15: 'пятнадцать',
};
const num = (n: number, spoken: boolean) => (spoken ? FEM[n] ?? String(n) : String(n));
export const coinsWord = (n: number, spoken = false) => `${num(n, spoken)}\u00A0${plural(n, 'монета', 'монеты', 'монет')}`;
export const pilesWord = (n: number, spoken = false) => `${num(n, spoken)}\u00A0${plural(n, 'кучка', 'кучки', 'кучек')}`;

/** What the captain asks. */
export function pierAsk(r: PierRound): string {
  const dat = CREW[r.who].dat;
  if (r.kind === 'deal') return `Отдай ${dat} ${words(r.frac, 'acc')} клада!`;
  if (r.kind === 'count') return `В сундуке ${coinsWord(r.total)}. ${capitalize(dat)} — ${words(r.frac)} клада. Сколько это монет?`;
  return `${CREW[r.who].name} получил ${words(r.frac, 'acc')} клада — ${coinsWord(r.part)}. Сколько монет было в сундуке?`;
}

/** Why the answer is what it is. `spoken` says fractions in words. */
export function pierExplain(r: PierRound, spoken = false): string {
  const { total, pile, answer } = pierNumbers(r);
  const fr = spoken ? capitalize(words(r.frac)) : str(r.frac);
  if (r.kind === 'whole') {
    return `${fr} — это одна кучка, а всего кучек ${num(r.frac.d, spoken)}. ${capitalize(pilesWord(r.frac.d, spoken))} по ${num(pile, spoken)} — это ${coinsWord(total, spoken)}.`;
  }
  return `${capitalize(coinsWord(total, spoken))} на ${pilesWord(r.frac.d, spoken)} — по ${num(pile, spoken)}. ${fr} — это ${pilesWord(r.frac.n, spoken)}, ${coinsWord(answer, spoken)}.`;
}

/** Hint while picking piles: how many piles to give. */
export const pierPickHint = (r: PierRound) =>
  `Отдать нужно ${words(r.frac, 'acc')}: ${pilesWord(r.frac.n)} из ${r.frac.d}. Выбери ${r.frac.n === 1 ? 'её' : 'их'} и нажми «Отдать».`;

export const PIER_LINES = {
  uneven: 'Кррра! Кучки разные — нечестно!',
  unevenHint: 'Кучки должны быть одинаковыми. Клади по одной монете в каждую кучку по очереди.',
  few: 'Маловато будет!',
  many: 'Кррра! А команде что останется?',
  right: 'Честно поделили! Кррра!',
};
export const PIER_NOTES = ['', 'Клад поделён! Попробуй ещё раз без ошибок.', 'Почти без ошибок! Команда довольна.', 'Ни одной ошибки! Самый честный казначей на море!'];

// ---------- doctor ----------
/** Names stay in the nominative in speech: synthesizers often misplace stress in «Екибаса». */
export const PATIENTS: Record<PatientId, { name: string; she?: boolean }> = {
  borovik: { name: 'Дед Боровик' },
  tikhon: { name: 'Тихон' },
  ekibas: { name: 'Екибас' },
  pyh: { name: 'Пых' },
  osya: { name: 'Ося', she: true },
  usach: { name: 'Усач' },
  sardina: { name: 'Капитан Сардина', she: true },
  giraffe: { name: 'Жорж' },
  heron: { name: 'Доктор Цапля', she: true },
};
const his = (who: PatientId) => (PATIENTS[who].she ? 'Её' : 'Его');

const NUM_GEN: Record<number, string> = { 2: 'двух', 3: 'трёх', 4: 'четырёх', 6: 'шести' };
const WHOLE_WORDS: Record<number, string> = { 2: 'две вторых', 3: 'три третьих', 4: 'четыре четвёртых', 6: 'шесть шестых' };
export const partsWord = (n: number, spoken = false) => `${num(n, spoken)}\u00A0${plural(n, 'часть', 'части', 'частей')}`;

const isOne = (h: Frac) => h.n === h.d;
const above = (h: Frac) => h.n > h.d;
/** «5/4 = 1 1/4» */
export const mixed = (h: Frac) => `${str(h)} = 1 ${str({ n: h.n - h.d, d: h.d })}`;

/** «одна четвёртая домика», «ровно один домик» */
export const heightWords = (h: Frac) => (isOne(h) ? 'ровно один домик' : `${words(h)} домика`);

export const doctorSetAsk = (who: PatientId, h: Frac) =>
  who === 'heron' ? `Теперь измерь меня! Мой рост — ${heightWords(h)}. Поставь планку!`
    : `Это ${PATIENTS[who].name}. ${his(who)} рост — ${heightWords(h)}. Поставь планку!`;
/** `stretched`: the giraffe has stretched his neck and is taller than usual. */
export const doctorReadAsk = (who: PatientId, stretched = false) =>
  stretched ? `${PATIENTS[who].name} вытянул шею. Какой у него теперь рост?`
    : `Под ростомером ${PATIENTS[who].name}. Какой у ${PATIENTS[who].she ? 'неё' : 'него'} рост?`;
export const doctorSortAsk = (order: 'asc' | 'desc') =>
  order === 'asc' ? 'Расставь всех по росту: нажимай по очереди, от самого низкого до самого высокого.'
    : 'Расставь всех по росту: нажимай по очереди, от самого высокого до самого низкого.';

/** Why the height is what it is, counted on a chart with `ticks` divisions per house. */
export function doctorExplain(h: Frac, ticks: number, spoken = false): string {
  const fr = (x: Frac) => (spoken ? words(x) : str(x));
  if (isOne(h)) return `Ровно до крыши: это один целый домик, ${spoken ? WHOLE_WORDS[ticks] : `${ticks}/${ticks}`}.`;
  if (above(h)) {
    const rest = { n: h.n - h.d, d: h.d };
    return spoken ? `${capitalize(words(h))} — это один целый домик и ещё ${words(rest)}.`
      : `Один целый домик и ещё ${str(rest)}: ${mixed(h)}.`;
  }
  const k = (h.n * ticks) / h.d;
  const head = `Домик разделён на ${partsWord(ticks, spoken)}.`;
  if (h.d === ticks) return `${head} ${capitalize(fr(h))} — это ${partsWord(k, spoken)} снизу.`;
  return `${head} ${capitalize(fr(h))} — это ${partsWord(k, spoken)} из ${spoken ? NUM_GEN[ticks] ?? ticks : ticks}, ${fr({ n: k, d: ticks })}.`;
}

/** Sorting: which one should have come first. */
export function doctorSortExplain(first: PatientId, picked: PatientId, order: 'asc' | 'desc', spoken = false) {
  const fr = (x: Frac) => (spoken ? heightWords(x) : isOne(x) ? '1 домик' : `${str(x)} домика`);
  const a = PATIENTS[first], b = PATIENTS[picked];
  return `${order === 'asc' ? 'Сначала тот, кто ниже' : 'Сначала тот, кто выше'}: ${a.name} — ${fr(HEIGHTS[first])}, а ${b.name} — ${fr(HEIGHTS[picked])}.`;
}

export const DOCTOR_LINES = {
  bonk: 'Ой! Планка по макушке!',
  gap: 'Планка висит над головой.',
  giraffeWow: 'Ой! Я что, выше домика?!',
  extend: 'Не беда! Достроим ростомер.',
  stretch: 'Смотрите, я умею вытягивать шею!',
  same: (who: PatientId) => `Ростом как ${PATIENTS[who].name}!`,
};
export const DOCTOR_NOTES = ['', 'Все измерены! Попробуй ещё раз без ошибок.', 'Почти без ошибок! Доктор Цапля довольна.', 'Ни одной ошибки! Самый точный ростомер в городе!'];

// ---------- potion shop ----------
export const INGREDIENT: Record<IngredientId, { name: string; gen: string }> = {
  frog: { name: 'Лягушачий сок', gen: 'лягушачьего сока' },
  moon: { name: 'Лунная роса', gen: 'лунной росы' },
  pepper: { name: 'Драконий перец', gen: 'драконьего перца' },
  honey: { name: 'Мёд', gen: 'мёда' },
};
/** «части остались четвёртыми» */
const PARTS_INSTR: Record<number, string> = { 2: 'половинками', 3: 'третьими', 4: 'четвёртыми', 6: 'шестыми' };

/** n/d in words; a full flask is «четыре четвёртых», not «целая». */
const amount = (n: number, d: number) => (n === d ? WHOLE_WORDS[d] : words({ n, d }));
const listWords = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} и ${items.at(-1)}`);
const portions = (items: [IngredientId, number][], d: number) => listWords(items.map(([id, n]) => `${amount(n, d)} ${INGREDIENT[id].gen}`));

/** What Pip reads out from the recipe. */
export function potionAsk(r: PotionRound): string {
  if (r.kind === 'brew') return `Рецепт: ${portions(r.recipe, r.d)}.`;
  return `Нужно ${amount(r.target, r.d)} зелья. В колбе уже ${portions(r.start, r.d)}. Долей ${INGREDIENT[r.add].gen}!`;
}

export const potionQuestion = (r: PotionRound) => (r.kind === 'brew' ? 'Сколько зелья в колбе?' : `Сколько ${INGREDIENT[r.add].gen} долили?`);

/** Why the amount is what it is. */
export function potionExplain(r: PotionRound, spoken = false): string {
  const { start, total, answer } = potionNumbers(r);
  const d = r.d;
  if (r.kind === 'top') {
    return spoken ? `Нужно ${amount(total, d)}, было ${amount(start, d)}. Долили ${amount(answer, d)}.`
      : `${total}/${d} − ${start}/${d} = ${answer}/${d}.`;
  }
  const full = total === d;
  if (spoken) {
    const sum = r.recipe.map(([, n]) => amount(n, d)).join(' плюс ');
    return `${capitalize(sum)} — это ${amount(total, d)}.${full ? ' Одна целая — полная колба!' : ''} Числители складываем, знаменатель не меняется.`;
  }
  return `${r.recipe.map(([, n]) => `${n}/${d}`).join(' + ')} = ${total}/${d}${full ? ' = 1, полная колба!' : '.'} Числители складываем, знаменатель не меняется.`;
}

/** The classic mistake: adding the denominators too. */
export const potionDenominatorHint = (d: number) => `Знаменатели не складывают: части остались ${PARTS_INSTR[d] ?? d}.`;

/** What was poured wrong, for the first ingredient that is off. */
export function potionPourExplain(r: PotionRound, poured: Partial<Record<IngredientId, number>>, spoken = false): string {
  const d = r.d;
  const fr = (n: number) => (spoken ? amount(n, d) : `${n}/${d}`);
  const frAcc = (n: number) => (spoken ? (n === d ? WHOLE_WORDS[d] : words({ n, d }, 'acc')) : `${n}/${d}`);
  if (r.kind === 'top') {
    const now = Object.values(poured).reduce((a, b) => a + (b ?? 0), 0);
    return `Нужно ${fr(r.target)}, а в колбе ${fr(now)}.`;
  }
  const need = new Map(r.recipe);
  for (const [id, n] of Object.entries(poured) as [IngredientId, number][]) {
    if (n && !need.has(id)) return `${capitalize(INGREDIENT[id].gen)} в рецепте нет!`;
  }
  for (const [id, n] of r.recipe) {
    const got = poured[id] ?? 0;
    if (got !== n) return `${capitalize(INGREDIENT[id].gen)} нужно налить ${frAcc(n)}, а ${got ? `налито ${fr(got)}` : 'в колбе ни капли'}.`;
  }
  return '';
}

export const POTION_LINES = {
  boom: 'Бабах! Больше полной колбы не нальёшь.',
  fizzle: 'Пф-ф! Зелье не получилось.',
  brewing: 'Буль-буль… Зелье готово!',
};

/** What the right potion does to Pip; one per round, in turn. */
export const POTION_GAGS: { line: string; effect: 'green' | 'tiny' | 'float' | 'giant' | 'spin' }[] = [
  { line: 'Ой! Пип позеленел, как лягушка! Ква!', effect: 'green' },
  { line: 'Ой! Пип стал крошечным!', effect: 'tiny' },
  { line: 'Ой! Пип взлетел под потолок!', effect: 'float' },
  { line: 'Ой! Пип вырос до самого потолка!', effect: 'giant' },
  { line: 'Ой! Пип закружился волчком!', effect: 'spin' },
];
export const POTION_NOTES = ['', 'Зелья сварены! Попробуй ещё раз без ошибок.', 'Почти без ошибок! Волшебник доволен.', 'Ни одной ошибки! Пип — лучший ученик волшебника!'];

// ---------- monster house ----------
export const MONSTERS: Record<MonsterId, { name: string; dat: string; tag: string }> = {
  mummy: { name: 'Бабушка-мумия', dat: 'бабушке', tag: 'Бабушка' },
  wolf: { name: 'Папа-оборотень', dat: 'папе', tag: 'Папа' },
  slime: { name: 'Малыш-слизень', dat: 'малышу', tag: 'Малыш' },
  spider: { name: 'Паук', dat: 'пауку', tag: 'Паук' },
  bat: { name: 'Летучая мышь', dat: 'летучей мыши', tag: 'Мышь' },
};

const candlesWord = (n: number, spoken = false) => `${num(n, spoken)}\u00A0${plural(n, 'свеча', 'свечи', 'свечей')}`;
const frw = (n: number, d: number, spoken: boolean) => (spoken ? amount(n, d) : `${n}/${d}`);

export function monsterAsk(r: MonsterRound): string {
  switch (r.kind) {
    case 'cake': return `Раздай торт: ${r.gives.map(([who, n]) => `${MONSTERS[who].dat} — ${words({ n, d: r.slices })}`).join(', ')}.`;
    case 'web': return `Ветер порвал ${words({ n: r.torn, d: r.sectors }, 'acc')} паутины. Какая часть паутины осталась целой?`;
    case 'candles': return `Горит ${candlesWord(r.total)}. Сквозняк задует ${words(r.frac, 'acc')} свечей. Сколько свечей погаснет?`;
    case 'grow': return `Утром рост малыша — ${amount(r.was, r.d)} двери. За день он подрос ещё на ${words({ n: r.grew, d: r.d }, 'acc')}. Какой у него теперь рост?`;
    case 'clock': return `Сейчас ${timeWords(r.now)}. Гости придут через ${hourPart(r.plus)!.words}. Когда придут гости?`;
  }
}

/** The question shown with the answer buttons. */
export const monsterQuestion = (r: MonsterRound) =>
  ({ cake: 'Сколько торта осталось?', web: 'Сколько паутины целой?', candles: 'Сколько свечей погаснет?', grow: 'Какой теперь рост?', clock: 'Когда придут гости?' })[r.kind];

export function monsterExplain(r: MonsterRound, spoken = false): string {
  const a = monsterAnswer(r);
  switch (r.kind) {
    case 'cake': {
      const d = r.slices, given = r.gives.reduce((x, [, n]) => x + n, 0), left = d - given;
      const half = left * 2 === d ? ' Это половина торта!' : '';
      if (spoken) return `Отдали ${amount(given, d)}. Было ${amount(d, d)}, осталось ${amount(left, d)}.${half}`;
      return `Отдали ${r.gives.map(([, n]) => `${n}/${d}`).join(' + ')} = ${given}/${d}. Осталось ${d}/${d} − ${given}/${d} = ${left}/${d}.${half}`;
    }
    case 'web': {
      const d = r.sectors, whole = d - r.torn;
      return `Целая паутина — ${frw(d, d, spoken)}. Порвано ${frw(r.torn, d, spoken)}, значит, цело ${frw(whole, d, spoken)}.`;
    }
    case 'candles': {
      const part = r.total / r.frac.d, n = a as number;
      const fr = spoken ? capitalize(words(r.frac)) : str(r.frac);
      return `${capitalize(candlesWord(r.total, spoken))} на ${partsWord(r.frac.d, spoken)} — по ${num(part, spoken)}. ${fr} — это ${partsWord(r.frac.n, spoken)}: ${candlesWord(n, spoken)}.`;
    }
    case 'grow': {
      const d = r.d, sum = r.was + r.grew;
      const tail = sum === d ? (spoken ? ' Ровно до верха двери!' : ' = 1: ровно до верха двери!')
        : sum > d ? (spoken ? ` Это одна целая дверь и ещё ${amount(sum - d, d)}: малыш перерос дверь!` : ` = 1 ${sum - d}/${d}: малыш перерос дверь!`) : '';
      if (spoken) return `${capitalize(amount(r.was, d))} плюс ${amount(r.grew, d)} — это ${amount(sum, d)}.${tail}`;
      return `${r.was}/${d} + ${r.grew}/${d} = ${sum}/${d}${sum >= d ? tail : '.'}`;
    }
    case 'clock': {
      const t = a as number, part = hourPart(r.plus)!;
      if (spoken) return `${capitalize(part.words)} — это ${minutesWords(r.plus)}. Сейчас ${timeWords(r.now)}, через ${minutesWords(r.plus)} будет ${timeWords(t)}.`;
      return `${capitalize(part.words)} — это ${r.plus} минут. ${digital(r.now)} + ${r.plus} минут = ${digital(t)}, ${timeWords(t)}.`;
    }
  }
}

export const MONSTER_LINES = {
  give: 'Нажимай на кусочки торта: они сами полетят, кому надо.',
  mend: 'Нажимай на дырки — паук их залатает.',
  mended: 'Паутина снова целая!',
  light: 'Нажимай на погасшие свечи — зажги их снова!',
  lit: 'Фух, снова светло!',
  grown: 'Ух ты, я расту!',
  guests: 'Тук-тук! Гости пришли!',
  yum: 'Ммм, бабушкин торт!',
};
export const MONSTER_NOTES = ['', 'Комната пройдена! Попробуй ещё раз без ошибок.', 'Почти без ошибок! Монстры довольны.', 'Ни одной ошибки! Монстры зовут тебя в гости ещё!'];
export const DIPLOMA = {
  title: 'Диплом мастера дробей',
  text: 'Все места Половинкино пройдены, все жители довольны. Этот диплом вручается настоящему мастеру дробей!',
};

// ---------- beaver's bridge ----------
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

/** «1/2 + 1/4 + 1/4 = 2/4 + 1/4 + 1/4 = 4/4 = 1»: brought to one denominator when they differ. */
export function beaverExplain(placed: Frac[], gap: Frac, spoken = false): string {
  const L = placed.reduce((a, p) => lcm(a, p.d), gap.d);
  const sum = placed.reduce((a, p) => a + (p.n * L) / p.d, 0);
  const same = placed.every(p => p.d === placed[0].d) && (gap.n === gap.d || gap.d === placed[0].d);
  const whole = sum === L;
  if (spoken) {
    const notes = [...new Set(placed.map(p => p.d))].filter(d => d !== L)
      .map(d => `${capitalize(words({ n: 1, d }))} — это ${words({ n: L / d, d: L })}.`);
    const terms = placed.map(p => words(p)).join(' плюс ');
    return [...notes, `${capitalize(terms)} — ровно ${whole ? 'одна целая доска' : words(gap)}.`].join(' ');
  }
  const left = placed.map(str).join(' + ');
  const mid = same ? '' : ` = ${placed.map(p => `${(p.n * L) / p.d}/${L}`).join(' + ')}`;
  // When the hole is closed the sum is the hole: 4/4 = 1, or 9/12 = 3/4.
  return `${left}${mid} = ${sum}/${L}${whole ? ' = 1' : gap.d !== L ? ` = ${str(gap)}` : ''}.`;
}

/** The plank is longer than what is left of the hole. */
export function beaverTooLong(left: Frac, plank: Frac, spoken = false): string {
  const fr = (x: Frac) => (spoken ? words(x) : str(x));
  return `Не влезает! Осталось ${fr(left)}, а доска ${fr(plank)} — длиннее.`;
}

/** The plank is shorter than what is left: a slit stays open (only one plank may close it). */
export function beaverTooShort(left: Frac, plank: Frac, spoken = false): string {
  const fr = (x: Frac) => (spoken ? words(x) : str(x));
  return `Мало! Не хватало ${fr(left)}, а доска ${fr(plank)} — короче. Осталась щель.`;
}

/** «Я уже положил половину и одну четвёртую…» */
export function beaverAskMissing(laid: Frac[]): string {
  const list = laid.map(p => words(p, 'acc'));
  const said = list.length > 1 ? `${list.slice(0, -1).join(', ')} и ${list[list.length - 1]}` : list[0];
  return `Я уже положил ${said}. Сколько ещё не хватает? Дай одну доску!`;
}

export const beaverAsk = (gap: Frac) =>
  gap.n === gap.d ? 'Закрой дыру длиной в одну целую доску.' : `Дыра длиной ${words(gap)} доски. Закрой её ровно.`;

export const BEAVER_LINES = {
  done: 'Готово! Мост как новый!',
  cross: 'Можно идти к доктору!',
};
export const BEAVER_NOTES = ['', 'Мост починен! Попробуй ещё раз без ошибок.', 'Почти без ошибок! Бруно доволен.', 'Ни одной ошибки! Бруно берёт тебя в помощники!'];

// ---------- couriers ----------
export const CLIENTS: Record<CourierClient, string> = {
  osya: 'Ося', borovik: 'Дед Боровик', tikhon: 'Тихон', nosochka: 'Носочка', usach: 'Гном Усач', sardina: 'Капитан Сардина', giraffe: 'Жираф Жорж', pip: 'Совёнок Пип',
};

/** Names stay in the nominative: no stress to misplace. */
export const courierAsk = (who: CourierClient, at: Frac) => `${CLIENTS[who]} ждёт пиццу. Дом — ${words(at)} пути от пиццерии.`;

/** Where the client really is, counted on the street. */
export function courierExplain(lv: CourierLevel, at: Frac, spoken = false): string {
  const fr = (x: Frac) => (spoken ? words(x) : str(x));
  if (at.n > at.d) {
    const rest = { n: at.n - at.d, d: at.d };
    return spoken ? `${capitalize(words(at))} — это одна целая улица до перекрёстка и ещё ${words(rest)} второй улицы.`
      : `${mixed(at)}: одна целая улица до перекрёстка и ещё ${str(rest)} второй улицы.`;
  }
  const d = lv.ticks || at.d, k = (at.n * d) / at.d;
  const street = lv.length > 1 ? 'Каждая улица' : 'Улица';
  const head = lv.ticks ? `${street} разделена на ${partsWord(d, spoken)}.` : `Раздели улицу в уме на ${partsWord(d, spoken)}.`;
  return `${head} ${capitalize(fr(at))} — это ${partsWord(k, spoken)} пути от пиццерии.`;
}

export const COURIER_LINES = {
  far: 'Эй, я здесь! Ты проехал!',
  near: 'Ещё не доехал! Я дальше!',
  end: 'Конец улицы!',
  thanks: 'Спасибо! Горячая пицца!',
};
export const COURIER_NOTES = ['', 'Все пиццы доставлены! Попробуй ещё раз без ошибок.', 'Почти без ошибок! Клиенты довольны.', 'Ни одной ошибки! Шустрик — лучший курьер!'];
