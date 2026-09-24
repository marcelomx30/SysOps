import type { TimeSlice } from '@/engine';

/** What a process is doing during one second of the diagram. */
export type CellState = 'running' | 'ready' | 'none';

export interface DiagramRow {
  readonly processId: number;
  /** One cell per elapsed second, in chronological order. */
  readonly cells: readonly CellState[];
}

/**
 * Pivots the engine's timeline (one record per second) into one row per
 * process, which is the shape a horizontal Gantt chart draws.
 *
 * Pure re-indexing of `timeline`: it decides nothing about scheduling, so the
 * web diagram cannot diverge from the CLI's, which reads the same data.
 * `none` covers both "not created yet" and "already finished".
 */
export function buildDiagramRows(
  timeline: readonly TimeSlice[],
  processCount: number,
): DiagramRow[] {
  return Array.from({ length: processCount }, (_, index) => {
    const processId = index + 1;
    return { processId, cells: timeline.map((slice) => cellOf(slice, processId)) };
  });
}

function cellOf(slice: TimeSlice, processId: number): CellState {
  if (slice.running === processId) return 'running';
  return slice.ready.includes(processId) ? 'ready' : 'none';
}
