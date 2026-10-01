import { describe, expect, it } from 'vitest';
import { BEFORE_START, clampInstant } from '../playback_contract';

describe('clampInstant', () => {
  it('keeps an instant inside the timeline untouched', () => {
    expect(clampInstant(5, 14)).toBe(5);
  });

  it('stops at the last drawable instant', () => {
    expect(clampInstant(99, 14)).toBe(13);
  });

  it('floors at "nothing has run yet"', () => {
    expect(clampInstant(-9, 14)).toBe(BEFORE_START);
  });

  it('treats an empty timeline as not started', () => {
    expect(clampInstant(3, 0)).toBe(BEFORE_START);
  });
});
