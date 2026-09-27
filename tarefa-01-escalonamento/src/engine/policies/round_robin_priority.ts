import type { SchedulingPolicy, SelectionContext } from '../scheduling_policy';
import type { Process } from '../types';
import { CircularQueue } from './circular_queue';

/**
 * Round-Robin with priority and aging.
 *
 * This is the algorithm that closes the project's argument: plain priority
 * fixes the unfairness of deciding by time alone, but condemns the least
 * prioritary process to starvation; aging gives it a chance back, without
 * giving up on priority.
 *
 * The assignment imposes two specific restrictions on this algorithm:
 *
 * 1. aging happens once per quantum, not per second — hence the adjustment
 *    lives in `onSliceEnd`, the only hook the loop calls at slice boundaries.
 *    A slice cut short because the process finished also counts: the CPU is
 *    reevaluated there just like at the end of a full quantum;
 * 2. there is no preemption by priority — hence `preemptive = false`: a process
 *    that already holds the CPU completes its slice even if someone reaches a
 *    higher priority in the middle of it.
 *
 * One instance per simulation — the queue is state, as in `RoundRobinPolicy`.
 */
export class RoundRobinPriorityPolicy implements SchedulingPolicy {
  readonly name = 'Round-Robin with priority and aging';
  readonly preemptive = false;
  readonly usesQuantum = true;

  private readonly queue = new CircularQueue();

  /**
   * Sorts by dynamic priority — lower number, higher priority, following the
   * Unix convention the team adopted — and uses the queue to break ties among
   * processes of equal priority, which preserves the rotation inside each band.
   */
  sort(context: SelectionContext): readonly Process[] {
    this.queue.sync(context.ready);
    return [...context.ready].sort(
      (first, second) =>
        first.dynamicPriority - second.dynamicPriority ||
        this.queue.position(first) - this.queue.position(second),
    );
  }

  /**
   * Dynamic priority followed by queue position is a total order, so no two
   * distinct processes are tied: among equal priorities the queue decides, and
   * the queue orders processes created at the same instant by input order.
   */
  areTied(first: Process, second: Process): boolean {
    return first === second;
  }

  /**
   * Slice boundary: ages whoever waited and resets whoever was served.
   *
   * Aging means subtracting `aging`, because the scale is inverted (lower
   * number = higher priority): waiting moves the process towards the top. There
   * is no floor — a floor at 1 would bring back permanent ties among the aged
   * processes and weaken the very guarantee against starvation.
   *
   * The dynamic priority of the served process is restored here, when it gives
   * the CPU back, and not at the instant it receives it. The effect is the same
   * — the dynamic priority is not consulted while the process holds the
   * processor — and this is the only hook the policy interface offers.
   */
  onSliceEnd(context: SelectionContext, chosen: Process): void {
    for (const process of context.ready) {
      if (process.id !== chosen.id) {
        process.dynamicPriority -= context.configuration.aging;
      }
    }

    chosen.dynamicPriority = chosen.staticPriority;
    this.queue.markSliceEnd(chosen);
  }
}
