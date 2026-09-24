import { describe, expect, it } from 'vitest';
import {
  HERO_ACTS,
  VIDEO_DURATION_SECONDS,
  actStartProgress,
  activeActIndex,
  progressToTime,
  scrollProgress,
} from '../hero_model';

describe('scrollProgress', () => {
  const HEIGHT = 5000;
  const VIEWPORT = 1000;

  it('is 0 before the section reaches the top of the viewport', () => {
    expect(scrollProgress(300, HEIGHT, VIEWPORT)).toBe(0);
    expect(scrollProgress(0, HEIGHT, VIEWPORT)).toBe(0);
  });

  it('grows linearly while the section is pinned', () => {
    expect(scrollProgress(-2000, HEIGHT, VIEWPORT)).toBeCloseTo(0.5);
  });

  it('is 1 once the whole scrollable distance has passed', () => {
    expect(scrollProgress(-4000, HEIGHT, VIEWPORT)).toBe(1);
    expect(scrollProgress(-9000, HEIGHT, VIEWPORT)).toBe(1);
  });

  it('is 0 when the section is not taller than the viewport', () => {
    expect(scrollProgress(-50, 800, 1000)).toBe(0);
  });
});

describe('progressToTime', () => {
  it('maps progress onto the video duration', () => {
    expect(progressToTime(0)).toBe(0);
    expect(progressToTime(0.5)).toBeCloseTo(VIDEO_DURATION_SECONDS / 2);
  });

  it('stops one frame before the end so the last frame is still decodable', () => {
    expect(progressToTime(1)).toBeLessThan(VIDEO_DURATION_SECONDS);
    expect(progressToTime(1)).toBeCloseTo(VIDEO_DURATION_SECONDS - 1 / 30);
  });

  it('clamps out-of-range and non-numeric progress', () => {
    expect(progressToTime(-1)).toBe(0);
    expect(progressToTime(7)).toBe(progressToTime(1));
    expect(progressToTime(Number.NaN)).toBe(0);
  });
});

describe('HERO_ACTS', () => {
  it('has the five acts of the video, in chronological order', () => {
    expect(HERO_ACTS.map((act) => act.startSeconds)).toEqual([0, 3, 6, 9, 12]);
  });
});

describe('activeActIndex', () => {
  it('returns the act whose interval contains the instant', () => {
    expect(activeActIndex(0)).toBe(0);
    expect(activeActIndex(2.99)).toBe(0);
    expect(activeActIndex(3)).toBe(1);
    expect(activeActIndex(8.5)).toBe(2);
    expect(activeActIndex(14.9)).toBe(4);
  });

  it('never leaves the valid range', () => {
    expect(activeActIndex(-5)).toBe(0);
    expect(activeActIndex(99)).toBe(HERO_ACTS.length - 1);
  });
});

describe('actStartProgress', () => {
  it('is the fraction of the video at which the act begins', () => {
    expect(actStartProgress(0)).toBe(0);
    expect(actStartProgress(2)).toBeCloseTo(6 / VIDEO_DURATION_SECONDS);
  });

  it('lands inside the act it points to', () => {
    HERO_ACTS.forEach((_, index) => {
      expect(activeActIndex(progressToTime(actStartProgress(index) + 0.001))).toBe(index);
    });
  });

  it('rejects an act index that does not exist, naming the value', () => {
    expect(() => actStartProgress(5)).toThrow(/5/);
    expect(() => actStartProgress(-1)).toThrow(/-1/);
  });
});
