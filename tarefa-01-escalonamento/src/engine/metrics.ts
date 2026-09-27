import type {
  Process,
  ProcessMetrics,
  SimulationResult,
  TimeSlice,
} from './types';

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Counts context switches by walking the timeline.
 *
 * A switch is every change of CPU occupant. Idle slices do not count and do not
 * reset the previous occupant: before the first process is created there is no
 * context to save, and across a gap between two processes the change from one
 * to the other counts as a single switch.
 */
function countContextSwitches(timeline: readonly TimeSlice[]): number {
  let switches = 0;
  let previous: number | null = null;

  for (const slice of timeline) {
    if (slice.running === null) continue;
    if (previous !== null && previous !== slice.running) switches += 1;
    previous = slice.running;
  }

  return switches;
}

/**
 * Derives the metrics required by the assignment at the end of a simulation.
 *
 * Everything comes from the timeline — nothing is recounted by each algorithm,
 * and nothing depends on the state the policies manipulate during the loop. All
 * seven policies in the assignment use exactly this calculation, and it measures
 * the same data the CLI prints and the web interface animates: if the diagram
 * is right, the metrics are right.
 *
 * Turnaround comes from the process's last second of execution; waiting time
 * from counting the seconds it was ready without the CPU. They are two
 * independent readings of the same timeline, and `metrics.test.ts` holds them
 * to the identity `waitingTime === turnaroundTime - duration`.
 */
export function calculateMetrics(
  algorithm: string,
  processes: readonly Process[],
  timeline: readonly TimeSlice[],
): SimulationResult {
  const perProcess: ProcessMetrics[] = processes.map((process) => {
    const executed = timeline.filter((slice) => slice.running === process.id);
    if (executed.length === 0) {
      throw new Error(
        `Process P${process.id} does not appear in the timeline of "${algorithm}". ` +
          `Expected: at least one running slice by the end of the simulation.`,
      );
    }

    // A slice covers [instant, instant + 1): completion is the end of the last one.
    const completionTime = executed[executed.length - 1].instant + 1;
    const turnaroundTime = completionTime - process.creationTime;
    const waitingTime = timeline.filter((slice) => slice.ready.includes(process.id)).length;

    return {
      id: process.id,
      turnaroundTime,
      waitingTime,
      responseTime: executed[0].instant - process.creationTime,
    };
  });

  return {
    algorithm,
    timeline,
    perProcess,
    averageTurnaroundTime: average(perProcess.map((metrics) => metrics.turnaroundTime)),
    averageWaitingTime: average(perProcess.map((metrics) => metrics.waitingTime)),
    contextSwitches: countContextSwitches(timeline),
  };
}
