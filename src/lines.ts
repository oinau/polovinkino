// Everything the characters say. Kept apart from the scenes so the voice studio
// can list every spoken phrase for recording.
import type { CustomerId } from './art';
import { HEIGHTS, pierNumbers, potionNumbers, type CrewId, type Dispute, type IngredientId, type PatientId, type PierRound, type PotionRound } from './levels';
import { capitalize, compare, str, words, type Frac } from './fractions';
import { hourPart, meetWords, minuteMark, minutesWords, timeWords } from './time';

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
export type HeroId = CustomerId | 'pyh' | 'gnomes' | 'nosochka' | 'pier' | 'heron' | 'giraffe' | 'pip';

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
  if (isOne(h)) return `Ровно до конька крыши: это один целый домик, ${spoken ? WHOLE_WORDS[ticks] : `${ticks}/${ticks}`}.`;
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
