'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { BEFORE_START, SPEEDS, clampInstant, type PlaybackState } from './playback_contract';

export type { PlaybackState } from './playback_contract';
export { clampInstant } from './playback_contract';

export interface PlaybackCommands {
  readonly play: () => void;
  readonly pause: () => void;
  readonly toggle: () => void;
  readonly seek: (instant: number) => void;
  readonly setSpeed: (speed: number) => void;
  readonly reset: () => void;
}

export type PlaybackModel = PlaybackState & PlaybackCommands;
type StateSetter = Dispatch<SetStateAction<PlaybackState>>;

export function resetPlayback(speed: number = 1): PlaybackState {
  return {
    currentInstant: BEFORE_START,
    isPlaying: false,
    speed,
  };
}

export function seekPlayback(state: PlaybackState, instant: number, length: number): PlaybackState {
  if (!Number.isFinite(instant)) {
    throw new RangeError(`Received instant ${instant}; expected a finite number.`);
  }
  const currentInstant = clampInstant(Math.floor(instant), length);
  return {
    ...state,
    currentInstant,
    isPlaying: state.isPlaying && currentInstant < length - 1,
  };
}

export function advancePlayback(state: PlaybackState, length: number): PlaybackState {
  if (!state.isPlaying) return state;
  return seekPlayback(state, state.currentInstant + 1, length);
}

export function startPlayback(state: PlaybackState, length: number): PlaybackState {
  const currentInstant = state.currentInstant >= length - 1
    ? BEFORE_START : state.currentInstant;
  return { ...state, currentInstant, isPlaying: length > 0 };
}

export function tickDuration(speed: number): number {
  if (!SPEEDS.includes(speed)) {
    throw new RangeError(`Received speed ${speed}; expected one of ${SPEEDS.join(', ')}.`);
  }
  return 1000 / speed;
}

function usePlaybackClock(state: PlaybackState, length: number, setState: StateSetter): void {
  useEffect(() => {
    if (!state.isPlaying) return;
    const timer = setInterval(() => {
      setState((previous) => advancePlayback(previous, length));
    }, tickDuration(state.speed));
    return () => clearInterval(timer);
  }, [state.isPlaying, state.speed, length, setState]);
}

function usePlaybackCommands(length: number, setState: StateSetter): PlaybackCommands {
  const play = useCallback(() => setState((state) => startPlayback(state, length)), [length, setState]);
  const pause = useCallback(() => setState((state) => ({ ...state, isPlaying: false })), [setState]);
  const toggle = useCallback(() => setState((state) => state.isPlaying
    ? { ...state, isPlaying: false } : startPlayback(state, length)), [length, setState]);
  const seek = useCallback((instant: number) => {
    setState((state) => seekPlayback(state, instant, length));
  }, [length, setState]);
  const setSpeed = useCallback((speed: number) => {
    tickDuration(speed);
    setState((state) => ({ ...state, speed }));
  }, [setState]);
  const reset = useCallback(() => setState((state) => resetPlayback(state.speed)), [setState]);
  return { play, pause, toggle, seek, setSpeed, reset };
}

export function usePlayback(timelineLength: number): PlaybackModel {
  if (!Number.isInteger(timelineLength) || timelineLength < 0) {
    throw new RangeError(`Received timeline length ${timelineLength}; expected a non-negative integer.`);
  }
  const [state, setState] = useState<PlaybackState>(() => resetPlayback());
  const [length, setLength] = useState(timelineLength);
  // Reset during render so a replacement timeline never receives the old frame.
  if (length !== timelineLength) {
    setLength(timelineLength);
    setState(resetPlayback(state.speed));
  }
  usePlaybackClock(state, timelineLength, setState);
  const commands = usePlaybackCommands(timelineLength, setState);
  return { ...state, ...commands };
}
