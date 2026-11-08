// How the game's words are written for the speech synthesizer. The screen and the recording keys
// keep the normal spelling: this only changes the text handed to speechSynthesis.

/** How to mark stress; voices differ, so it is chosen by ear on each device (pronounce.html). */
export type StressMode = 'none' | 'acute' | 'caps';
export const STRESS_MODES: { mode: StressMode; label: string }[] = [
  { mode: 'none', label: 'не ставить' },
  { mode: 'acute', label: 'знаком ударения' },
  { mode: 'caps', label: 'заглавной гласной' },
];

export const ACUTE = '́';

/** Written as heard: every voice reads letters, so this works everywhere. «пицца» → «пица». */
const RESPELL: [RegExp, string][] = [
  [/пицц/g, 'пиц'],
  [/Пицц/g, 'Пиц'],
  // Voices spell «Ммм» out letter by letter («эм-эм-эм»).
  [/(?<![а-яёА-ЯЁ])Мм+(?![а-яёА-ЯЁ])/g, 'Ээм'],
];

/** Word forms with «'» after the stressed vowel. Capitalized forms are matched too. */
export const STRESSED = [
  "Ца'пля", "Ца'пли",
  "Екиба'с", "Екиба'са", "Екиба'су",
  "Борови'к", "Боровика'",
  "Сарди'на", "Сарди'ны",
  "Ти'хон", "Ти'хона",
  "Носо'чка", "Носо'чку",
  "Уса'ч", "Усача'",
  "Очка'рик", "Очка'рика",
  "Полови'нкино",
  "тре'ти", "тре'тьих",
  "шесты'х",
  "ку'чка", "ку'чки", "ку'чку", "ку'чек",
  "до'мик", "до'мика",
];

const LETTER = 'а-яёА-ЯЁ';
const plain = (w: string) => w.replace("'", '');
const upperFirst = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** The form with its stress written the chosen way. */
export function markStress(form: string, mode: StressMode) {
  const i = form.indexOf("'");
  if (mode === 'none' || i < 1) return plain(form);
  const before = form.slice(0, i - 1), vowel = form[i - 1], after = form.slice(i + 1);
  return mode === 'acute' ? `${before}${vowel}${ACUTE}${after}` : `${before}${vowel.toUpperCase()}${after}`;
}

const RULES = STRESSED.flatMap(form => [form, upperFirst(form)]).map(form => ({
  form,
  re: new RegExp(`(?<![${LETTER}])${plain(form)}(?![${LETTER}])`, 'g'),
}));

export function forSpeech(text: string, mode: StressMode): string {
  let s = text;
  for (const [re, to] of RESPELL) s = s.replace(re, to);
  if (mode === 'none') return s;
  for (const { form, re } of RULES) s = s.replace(re, markStress(form, mode));
  return s;
}
