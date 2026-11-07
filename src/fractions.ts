export interface Frac {
  n: number;
  d: number;
}

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export const simplify = ({ n, d }: Frac): Frac => {
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};

export const sameValue = (a: Frac, b: Frac) => a.n * b.d === b.n * a.d;

/** -1 if a < b, 0 if equal, 1 if a > b */
export const compare = (a: Frac, b: Frac) => Math.sign(a.n * b.d - b.n * a.d);

export const str = ({ n, d }: Frac) => `${n}/${d}`;

/** «a от b»: a × b, simplified. */
export const mul = (a: Frac, b: Frac) => simplify({ n: a.n * b.n, d: a.d * b.d });

// Ordinal stems for the denominators used at school ("третья", "шестых"...).
const STEM: Record<number, string> = {
  2: 'втор', 3: 'трет', 4: 'четвёрт', 5: 'пят', 6: 'шест', 7: 'седьм', 8: 'восьм', 9: 'девят', 10: 'десят', 12: 'двенадцат',
};
const COUNT_GEN: Record<number, string> = {
  2: 'двух', 3: 'трёх', 4: 'четырёх', 5: 'пяти', 6: 'шести', 7: 'семи', 8: 'восьми', 9: 'девяти', 10: 'десяти', 11: 'одиннадцати',
};
const COUNT: Record<number, string> = {
  2: 'две', 3: 'три', 4: 'четыре', 5: 'пять', 6: 'шесть', 7: 'семь', 8: 'восемь', 9: 'девять', 10: 'десять', 11: 'одиннадцать',
};

/**
 * Fraction in words, as said in a Russian maths lesson.
 * nom: «одна третья», «две третьих»; acc: «одну третью», «две третьих»;
 * gen (after «больше / меньше»): «одной третьей», «двух третьих».
 * One half is spoken as «половина / половину / половины».
 */
export function words({ n, d }: Frac, kase: 'nom' | 'acc' | 'gen' = 'nom'): string {
  if (n === d) return { nom: 'целая', acc: 'целую', gen: 'целой' }[kase];
  if (n === 1 && d === 2) return { nom: 'половина', acc: 'половину', gen: 'половины' }[kase];
  const stem = STEM[d] ?? `${d}-`;
  if (n === 1) {
    if (d === 3) return { nom: 'одна третья', acc: 'одну третью', gen: 'одной третьей' }[kase];
    return { nom: `одна ${stem}ая`, acc: `одну ${stem}ую`, gen: `одной ${stem}ой` }[kase];
  }
  const plural = d === 3 ? 'третьих' : `${stem}ых`;
  const count = kase === 'gen' ? COUNT_GEN[n] : COUNT[n];
  return `${count ?? n} ${plural}`;
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
