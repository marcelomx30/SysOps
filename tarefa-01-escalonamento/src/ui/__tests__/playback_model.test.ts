import { describe, expect, it } from 'vitest';
import { BEFORE_START } from '../playback_contract';
import {
  advancePlayback,
  resetPlayback,
  seekPlayback,
  startPlayback,
  tickDuration,
} from '../playback_model';

const LENGTH = 14;
const playing = { ...resetPlayback(), isPlaying: true };

describe('resetPlayback', () => {
  it('starts before the first instant, paused', () => {
    const state = resetPlayback();
    expect(state.currentInstant).toBe(BEFORE_START);
    expect(state.isPlaying).toBe(false);
  });

  it('keeps the chosen speed across a reset', () => {
    expect(resetPlayback(4).speed).toBe(4);
  });
});

describe('advancePlayback', () => {
  it('moves one instant per tick while playing', () => {
    expect(advancePlayback(playing, LENGTH).currentInstant).toBe(0);
  });

  it('does not move while paused', () => {
    const paused = { ...playing, isPlaying: false, currentInstant: 3 };
    expect(advancePlayback(paused, LENGTH).currentInstant).toBe(3);
  });

  it('stops at the last instant instead of wrapping around', () => {
    const atEnd = { ...playing, currentInstant: LENGTH - 2 };
    const next = advancePlayback(atEnd, LENGTH);
    expect(next.currentInstant).toBe(LENGTH - 1);
    expect(next.isPlaying).toBe(false);
  });
});

describe('seekPlayback', () => {
  it('clamps past the end of the timeline', () => {
    expect(seekPlayback(playing, 99, LENGTH).currentInstant).toBe(LENGTH - 1);
  });

  it('clamps below the start', () => {
    expect(seekPlayback(playing, -9, LENGTH).currentInstant).toBe(BEFORE_START);
  });

  it('truncates a fractional instant from a range input', () => {
    expect(seekPlayback(playing, 4.7, LENGTH).currentInstant).toBe(4);
  });
});

describe('startPlayback', () => {
  it('replays from the beginning when already at the end', () => {
    const atEnd = { ...resetPlayback(), currentInstant: LENGTH - 1 };
    const started = startPlayback(atEnd, LENGTH);
    expect(started.currentInstant).toBe(BEFORE_START);
    expect(started.isPlaying).toBe(true);
  });

  it('resumes in place when stopped midway', () => {
    const midway = { ...resetPlayback(), currentInstant: 5 };
    expect(startPlayback(midway, LENGTH).currentInstant).toBe(5);
  });

  it('refuses to play an empty timeline', () => {
    expect(startPlayback(resetPlayback(), 0).isPlaying).toBe(false);
  });
});

describe('tickDuration', () => {
  it('halves the interval when the speed doubles', () => {
    expect(tickDuration(2)).toBe(tickDuration(1) / 2);
  });

  it('rejects a speed outside the offered set, naming the value', () => {
    expect(() => tickDuration(3)).toThrow(/Received speed 3/);
  });
});
