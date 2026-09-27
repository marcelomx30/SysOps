import type { SchedulingPolicy, SelectionContext } from '../scheduling_policy';
import type { Process } from '../types';

/**
 * Priority without preemption: chooses the ready process with the highest priority.
 *
 * The scale is positive and **lower number = higher priority**, following the
 * Unix convention (`nice`) the team adopted for every priority algorithm. In the
 * assignment example, P3 (priority 1) is the most prioritary and P4 (priority 4)
 * the least.
 *
 * Since there is no preemption, the chosen process holds the CPU until it
 * finishes: a more prioritary process that arrives in the middle waits. Uses the
 * static priority — only the aging algorithm changes priorities over time.
 */
export class NonPreemptivePriorityPolicy implements SchedulingPolicy {
  readonly name = 'Priority (non-preemptive)';
  readonly preemptive = false;
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
