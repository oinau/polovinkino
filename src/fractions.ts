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

// Ordinal stems for the denominators used at school ("третья", "шестых"...).
const STEM: Record<number, string> = {
  2: 'втор', 3: 'трет', 4: 'четвёрт', 5: 'пят', 6: 'шест', 7: 'седьм', 8: 'восьм', 9: 'девят', 10: 'десят', 12: 'двенадцат',
};
const COUNT: Record<number, string> = {
  2: 'две', 3: 'три', 4: 'четыре', 5: 'пять', 6: 'шесть', 7: 'семь', 8: 'восемь', 9: 'девять', 10: 'десять', 11: 'одиннадцать',
};

/**
 * Fraction in words, as said in a Russian maths lesson.
 * nom: «одна третья», «две третьих»; acc: «одну третью», «две третьих».
 * One half is spoken as «половина / половину».
 */
export function words({ n, d }: Frac, kase: 'nom' | 'acc' = 'nom'): string {
  if (n === d) return kase === 'nom' ? 'целая' : 'целую';
  if (n === 1 && d === 2) return kase === 'nom' ? 'половина' : 'половину';
  const stem = STEM[d] ?? `${d}-`;
  if (n === 1) {
    if (d === 3) return kase === 'nom' ? 'одна третья' : 'одну третью';
    return kase === 'nom' ? `одна ${stem}ая` : `одну ${stem}ую`;
  }
  const plural = d === 3 ? 'третьих' : `${stem}ых`;
  return `${COUNT[n] ?? n} ${plural}`;
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
