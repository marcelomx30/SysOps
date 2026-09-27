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

  /**
   * Processes created at the same instant are served in input order, as in the
   * assignment's time diagram (P1 and P2 are both created at t=0 and P1 runs
   * first). The order of arrival is then total and nobody is ever tied.
   */
  sort(context: SelectionContext): readonly Process[] {
    return [...context.ready].sort(
      (first, second) => first.creationTime - second.creationTime || first.id - second.id,
    );
  }

  areTied(first: Process, second: Process): boolean {
    return first === second;
  }
}
