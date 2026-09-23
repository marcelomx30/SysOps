import type { SchedulingPolicy, SelectionContext } from '../scheduling_policy';
import type { Process } from '../types';

/**
 * Shortest Remaining Time First: preemptive version of SJF.
 *
 * Every second it reevaluates who has the shortest **remaining** time, so the
 * arrival of a process shorter than the current one's remaining time takes the
 * CPU. A tie keeps the current process by the simulator's tie-breaking rule,
 * avoiding an unnecessary context switch.
 */
export class ShortestRemainingTimeFirstPolicy implements SchedulingPolicy {
  readonly name = 'SRTF (Shortest Remaining Time First)';
  readonly preemptive = true;
  readonly usesQuantum = false;

  sort(context: SelectionContext): readonly Process[] {
    return [...context.ready].sort((first, second) => first.remainingTime - second.remainingTime);
  }

  areTied(first: Process, second: Process): boolean {
    return first.remainingTime === second.remainingTime;
  }
}
