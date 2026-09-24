import { describe, expect, it } from 'vitest';
import type { TimeSlice } from '@/engine';
import { buildDiagramRows } from '../diagram_model';

const TIMELINE: TimeSlice[] = [
  { instant: 0, running: 1, ready: [2] },
  { instant: 1, running: 2, ready: [1] },
  { instant: 2, running: 1, ready: [] },
  { instant: 3, running: null, ready: [] },
];

describe('buildDiagramRows', () => {
  it('produces one row per process, numbered from P1', () => {
    const rows = buildDiagramRows(TIMELINE, 3);
    expect(rows.map((row) => row.processId)).toEqual([1, 2, 3]);
  });

  it('gives every row one cell per elapsed second', () => {
    for (const row of buildDiagramRows(TIMELINE, 2)) {
      expect(row.cells).toHaveLength(TIMELINE.length);
    }
  });

  it('marks the running process, the ready ones and everything else as none', () => {
    const [first, second] = buildDiagramRows(TIMELINE, 2);
    expect(first.cells).toEqual(['running', 'ready', 'running', 'none']);
    expect(second.cells).toEqual(['ready', 'running', 'none', 'none']);
  });

  it('leaves a process that never appears entirely empty', () => {
    const [, , third] = buildDiagramRows(TIMELINE, 3);
    expect(third.cells).toEqual(['none', 'none', 'none', 'none']);
  });

  it('returns rows with no cells for an empty timeline', () => {
    expect(buildDiagramRows([], 2)).toEqual([
      { processId: 1, cells: [] },
      { processId: 2, cells: [] },
    ]);
  });
});
