import type { StressMode } from './pronounce/dictionary';

// Progress lives in localStorage: best stars per level and a coin purse.
const KEY = 'polovinkino.v1';

export type Place = 'pizza' | 'gnomes' | 'clock' | 'pier' | 'beaver' | 'doctor' | 'potion' | 'monsters';

interface Save {
  stars: Record<Place, number[]>;
  coins: number;
  sound: boolean;
  /** Chosen speech voice name; empty = pick the best one automatically. */
  voice?: string;
  /** Heroes already introduced with a card. */
  met?: string[];
  /** How stress is marked for this device's voices (chosen on pronounce.html). */
  stress?: StressMode;
}

const fresh = (): Save => ({ stars: { pizza: [], gnomes: [], clock: [], pier: [], beaver: [], doctor: [], potion: [], monsters: [] }, coins: 0, sound: true });

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = { ...fresh(), ...JSON.parse(raw) } as Save;
    s.stars = { ...fresh().stars, ...s.stars };
    return s;
  } catch {
    return fresh();
  }
}

const save = load();
const persist = () => localStorage.setItem(KEY, JSON.stringify(save));

export const store = {
  stars: (place: Place, level: number) => save.stars[place][level] ?? 0,
  totalStars: (place: Place) => save.stars[place].reduce((a, b) => a + (b ?? 0), 0),
  /** A level is open when it is the first one or the previous one has at least a star. */
  unlocked: (place: Place, level: number) => level === 0 || (save.stars[place][level - 1] ?? 0) > 0,
  setStars(place: Place, level: number, stars: number) {
    save.stars[place][level] = Math.max(stars, save.stars[place][level] ?? 0);
    persist();
  },
  get coins() { return save.coins; },
  addCoins(n: number) { save.coins += n; persist(); },
  get sound() { return save.sound; },
  set sound(v: boolean) { save.sound = v; persist(); },
  get voice() { return save.voice ?? ''; },
  met: (id: string) => (save.met ?? []).includes(id),
  /** Start over: stars, coins and introductions; sound and voice settings stay. */
  reset() {
    save.stars = fresh().stars;
    save.coins = 0;
    save.met = [];
    persist();
  },
  meet(id: string) {
    if (store.met(id)) return;
    save.met = [...(save.met ?? []), id];
    persist();
  },
  set voice(v: string) { save.voice = v; persist(); },
  get stress(): StressMode { return save.stress ?? 'none'; },
  set stress(v: StressMode) { save.stress = v; persist(); },
};
