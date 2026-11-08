// Town map layout: places stand along a winding road in a world wider than the screen.
import type { Place } from './store';

export const WORLD_W = 5800;
/** Parallax: the far mountain with the monster house moves slowest and never leaves the screen. */
export const FAR_FACTOR = 0.1;
export const MID_FACTOR = 0.5;

export interface Spot {
  key: string;
  /** World x of the building centre. */
  x: number;
  /** Ground line the building stands on. */
  y: number;
  name: string;
  place?: Place;
  scale: number;
}

/** In road order. Closed places have no `place` yet. */
export const SPOTS: Spot[] = [
  { key: 'house-pizza', x: 340, y: 850, name: 'Пиццерия «Кусочек»', place: 'pizza', scale: 0.92 },
  { key: 'house-gazebo', x: 980, y: 790, name: 'Беседка спорщиков', place: 'gnomes', scale: 0.92 },
  { key: 'house-clock', x: 1620, y: 850, name: 'Площадь с часами', place: 'clock', scale: 0.92 },
  { key: 'house-pier', x: 2280, y: 860, name: 'Пристань', place: 'pier', scale: 0.92 },
  { key: 'house-beaver', x: 2960, y: 870, name: 'Мост бобра Бруно', place: 'beaver', scale: 0.92 },
  { key: 'house-doctor', x: 3620, y: 800, name: 'Кабинет доктора', place: 'doctor', scale: 1.3 },
  { key: 'house-potion', x: 4240, y: 760, name: 'Зельеварня', place: 'potion', scale: 1.3 },
  { key: 'house-courier', x: 4860, y: 830, name: 'Курьеры', scale: 1.3 },
];

/** The road ends at the foot of the monster mountain. */
export const ROAD_END = { x: 5480, y: 720 };
/** River between the pier and the beaver's lodge; the road crosses it on Bruno's bridge. */
export const RIVER = { x: 2640, w: 170 };

export const maxScroll = () => WORLD_W - 1920;
export const clampScroll = (v: number) => Math.max(0, Math.min(maxScroll(), v));
/** Scroll that puts a world x in the middle of the screen. */
export const scrollTo = (x: number) => clampScroll(x - 960);

/** The first open place that still has a level without stars; null when everything is done. */
export function nextSpot(spots: Spot[], done: (p: Place) => boolean): Spot | null {
  return spots.find(s => s.place && !done(s.place)) ?? null;
}
