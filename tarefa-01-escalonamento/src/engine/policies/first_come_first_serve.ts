import type { SchedulingPolicy, SelectionContext } from '../scheduling_policy';
import type { Process } from '../types';

/**
 * First Come, First Served: serves in order of arrival, without preemption.
 *
 * The chosen process occupies the CPU until it finishes. It is the simplest
 * cooperative algorithm and serves as a baseline to compare the others: no
 * criterion other than the order of arrival enters the decision.
 */
export class FirstComeFirstServePolicy implements SchedulingPolicy {
  readonly name = 'FCFS (First Come, First Served)';
  readonly preemptive = false;
  readonly usesQuantum = false;

  sort(context: SelectionContext): readonly Process[] {
    // A tie on arrival is resolved by the simulator's rule, not by the id.
    return [...context.ready].sort((first, second) => first.creationTime - second.creationTime);
  }

  areTied(first: Process, second: Process): boolean {
    return first.creationTime === second.creationTime;
  }
}
