// Words and phrases to check, and the ways to write them for a speech synthesizer.
export const ACUTE = '́';
export const VOWELS = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';

/** Word or phrase; `stress` is the index of the stressed vowel in `text`; `respell` how it sounds. */
export interface Sample { text: string; stress?: number[]; respell?: string }

const at = (text: string, ...words: string[]) => words.flatMap(w => {
  // Index of the vowel marked with «'» in the template word, shifted to where the word sits in `text`.
  const plain = w.replace("'", '');
  const pos = text.indexOf(plain);
  return pos < 0 ? [] : [pos + w.indexOf("'") - 1];
});

export const SAMPLES: Sample[] = [
  { text: 'пицца', stress: [1], respell: 'пица' },
  { text: 'Цапля', stress: [1] },
  { text: 'Екибас', stress: [4] },
  { text: 'Боровик', stress: [5] },
  { text: 'Сардина', stress: [4] },
  { text: 'Тихон', stress: [1] },
  { text: 'Носочка', stress: [3] },
  { text: 'Усач', stress: [2] },
  { text: 'Очкарик', stress: [3] },
  { text: 'Половинкино', stress: [5] },
  { text: 'трети', stress: [2] },
  { text: 'шестых', stress: [4] },
  { text: 'кучки', stress: [1] },
  { text: 'домика', stress: [1] },
  { text: 'Мне две третьих пиццы!', respell: 'Мне две третьих пицы!' },
  { text: 'Это доктор Цапля.' },
  { text: 'Дед Боровик любит пиццу.', respell: 'Дед Боровик любит пицу.' },
  { text: 'Отдай коку две третьих клада!' },
];
// Phrases: stress the same words as in the word list.
for (const s of SAMPLES) {
  if (s.stress) continue;
  s.stress = at(s.text, "пи'цц", "Ца'пл", "Борови'к", "тре'тьих", "кла'да");
}

export function variant(s: Sample, kind: 'plain' | 'acute' | 'caps' | 'respell') {
  if (kind === 'plain') return s.text;
  if (kind === 'respell') return s.respell ?? null;
  if (!s.stress?.length) return null;
  const chars = [...s.text];
  for (const i of [...s.stress].sort((a, b) => b - a)) {
    if (!VOWELS.includes(chars[i])) continue;
    if (kind === 'acute') chars.splice(i + 1, 0, ACUTE);
    else chars[i] = chars[i].toUpperCase();
  }
  return chars.join('');
}
