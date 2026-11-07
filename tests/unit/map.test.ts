import { describe, expect, it } from 'vitest';
import { SPOTS, WORLD_W, clampScroll, maxScroll, nextSpot, scrollTo } from '../../src/map';
import type { Place } from '../../src/store';

describe('town map', () => {
  it('places go left to right along the road, inside the world', () => {
    const xs = SPOTS.map(s => s.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(Math.min(...xs)).toBeGreaterThan(200);
    expect(Math.max(...xs)).toBeLessThan(WORLD_W - 200);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1], 'buildings must not overlap').toBeGreaterThanOrEqual(560);
  });

  it('the next place is the first open one that is not finished', () => {
    const doneSet = (...p: Place[]) => (x: Place) => p.includes(x);
    expect(nextSpot(SPOTS, doneSet())?.place).toBe('pizza');
    expect(nextSpot(SPOTS, doneSet('pizza'))?.place).toBe('gnomes');
    expect(nextSpot(SPOTS, doneSet('pizza', 'clock'))?.place).toBe('gnomes');
    expect(nextSpot(SPOTS, doneSet('pizza', 'gnomes', 'clock'))).toBeNull();
  });

  it('scroll stays inside the world', () => {
    expect(clampScroll(-100)).toBe(0);
    expect(clampScroll(1e6)).toBe(maxScroll());
    expect(scrollTo(SPOTS[0].x)).toBe(0);
    expect(scrollTo(1960)).toBe(1000);
  });
});
