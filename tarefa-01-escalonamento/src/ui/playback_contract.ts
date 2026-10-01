import type { SimulationResult } from '@/engine';

/**
 * Shared contract between the playback engine and the animated stage.
 *
 * Two pieces of work plug into this file and nothing else: the playback model
 * owns the clock and produces `PlaybackState`; the stage consumes it and
 * draws. Keeping the seam this narrow is what lets both be built in parallel
 * without colliding.
 */

/** Where the playhead is, and whether it is moving. */
export interface PlaybackState {
  /**
   * Second currently under the playhead, `-1` before the run starts.
   *
   * Indexes `result.timeline`: instant `n` means `timeline[n]` is the slice
   * being shown. `-1` renders an empty stage, so a fresh run starts blank
   * instead of flashing the first slice.
   */
  readonly currentInstant: number;
  readonly isPlaying: boolean;
  /** Simulated seconds per real second. */
  readonly speed: number;
}

/** What the stage needs in order to draw a frame. */
export interface StageProps {
  readonly result: SimulationResult;
  readonly processCount: number;
  readonly playback: PlaybackState;
}

/** Playback speeds offered in the UI, in simulated seconds per real second. */
export const SPEEDS: readonly number[] = [0.5, 1, 2, 4];

/** Instant meaning "nothing has run yet". */
export const BEFORE_START = -1;

/**
 * Clamps an instant to the range a timeline can actually show.
 *
 * Shared so the controls and the stage agree on the bounds: a seek past the
 * end would otherwise paint a frame the playback model considers finished.
 *
 * @example
 * clampInstant(99, 14); // 13 — the last drawable instant
 */
export function clampInstant(instant: number, timelineLength: number): number {
  if (timelineLength === 0) return BEFORE_START;
  if (instant < BEFORE_START) return BEFORE_START;
  const last = timelineLength - 1;
  return instant > last ? last : instant;
}
