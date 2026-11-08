// What the check page plays: every dictionary word, and whole phrases from the game.
import { STRESSED } from './dictionary';

export const WORDS = ['пицца', ...STRESSED.map(w => w.replace("'", ''))];

export const PHRASES = [
  'Мне две третьих пиццы!',
  'Дед Боровик любит пиццу.',
  'Это Екибас. Его рост — половина домика. Поставь планку!',
  'Теперь измерь меня! Мой рост — ровно один домик.',
  'Больше у Усача: три кучки, а у Очкарика две.',
  'Тихон ждёт Носочку у больших часов.',
  'Отдай коку две третьих клада!',
];
