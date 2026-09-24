import type { TimeSlice } from '../engine';

/** Process occupying the processor. */
const RUNNING = '##';
/** Process ready, waiting for the processor. */
const READY = '--';

/**
 * Builds the vertical time diagram required by the assignment.
 *
 * One line per second, top to bottom, one column per process:
 *
 * ```
 * tempo  P1 P2 P3 P4
 *  0- 1  ## --
 *  1- 2  ## -- --
 *  2- 3  -- ## --
 * ```
 *
 * `##` holds the processor, `--` is ready and waiting, blank is a process not
 * yet created or already finished. The widths of the time label and of the
 * columns are computed from the data instead of fixed at two characters,
 * because the assignment warns that the simulator will be tested with other
 * inputs — with ten or more processes, or three-digit times, the alignment
 * still has to hold.
 */
export function formatDiagram(
  timeline: readonly TimeSlice[],
  processCount: number,
): string {
  const ids = Array.from({ length: processCount }, (_, index) => index + 1);
  const labels = ids.map((id) => `P${id}`);
  const columnWidths = labels.map((label) => Math.max(RUNNING.length, label.length));

  const end = timeline.length;
  const timeWidth = Math.max(2, String(end).length);
  const labelWidth = timeWidth * 2 + 1;

  // "tempo" is not a leftover translation: it is the literal header the
  // assignment's PDF specifies for the diagram. The code is in English, the
  // printed output follows the assignment.
  const header = joinCells(
    'tempo'.padEnd(labelWidth),
    labels.map((label, index) => label.padEnd(columnWidths[index])),
  );

  const lines = timeline.map((slice) => {
    const start = String(slice.instant).padStart(timeWidth);
    const finish = String(slice.instant + 1).padStart(timeWidth);

    const cells = ids.map((id, index) => {
      const mark = slice.running === id ? RUNNING : slice.ready.includes(id) ? READY : '';
      return mark.padEnd(columnWidths[index]);
    });

    return joinCells(`${start}-${finish}`, cells);
  });

  return [header, ...lines].join('\n');
}

/** Label, two spaces and the cells separated by one space, with no trailing slack. */
function joinCells(label: string, cells: readonly string[]): string {
  return `${label}  ${cells.join(' ')}`.trimEnd();
}
