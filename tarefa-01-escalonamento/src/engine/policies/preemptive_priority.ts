import type { SchedulingPolicy, SelectionContext } from '../scheduling_policy';
import type { Process } from '../types';

/**
 * Priority with preemption: preemptive version of the priority algorithm.
 *
 * Same criterion as `NonPreemptivePriorityPolicy` — lower number = higher
 * priority, following the Unix convention (`nice`) the team adopted — but the
 * CPU is reevaluated every second, so the arrival of a process with a higher
 * priority takes the CPU from the one running. A tie keeps the current process
 * by the simulator's tie-breaking rule, avoiding an unnecessary context switch.
 *
 * Uses the static priority: with no aging, a low-priority process can wait
 * indefinitely while higher-priority ones keep arriving — the starvation that
 * the round-robin with aging addresses.
 */
export class PreemptivePriorityPolicy implements SchedulingPolicy {
  readonly name = 'Priority (preemptive)';
  readonly preemptive = true;
  readonly usesQuantum = false;

  sort(context: SelectionContext): readonly Process[] {
    return [...context.ready].sort(
      (first, second) => first.staticPriority - second.staticPriority,
    );
  }

  areTied(first: Process, second: Process): boolean {
    return first.staticPriority === second.staticPriority;
  }
}
