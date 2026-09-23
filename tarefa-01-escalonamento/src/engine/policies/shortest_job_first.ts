import type { SchedulingPolicy, SelectionContext } from '../scheduling_policy';
import type { Process } from '../types';

/**
 * Shortest Job First: chooses the process with the shortest total duration, without preemption.
 *
 * Uses the **total** duration and not the remaining time — that is what sets it apart from SRTF.
 * Since there is no preemption, the difference only shows up when new processes arrive:
 * a short job that arrives in the middle waits for the current one to finish.
 */
export class ShortestJobFirstPolicy implements SchedulingPolicy {
  readonly name = 'SJF (Shortest Job First)';
  readonly preemptive = false;
  readonly usesQuantum = false;

  sort(context: SelectionContext): readonly Process[] {
    return [...context.ready].sort((first, second) => first.duration - second.duration);
  }

  areTied(first: Process, second: Process): boolean {
    return first.duration === second.duration;
  }
}
