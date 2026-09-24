import type { SchedulingPolicy, SelectionContext } from '../scheduling_policy';
import type { Process } from '../types';
import { CircularQueue } from './circular_queue';

/**
 * Round-Robin with quantum, without priority.
 *
 * Circular queue: each process occupies the CPU for at most `quantum` seconds
 * — a value read from the configuration file — and goes back to the end of the
 * line. It is the assignment's answer to the problem FCFS and SJF leave open:
 * a long process can no longer monopolize the processor.
 *
 * `preemptive = false` together with `usesQuantum = true` describes exactly
 * that: the process is not interrupted by any merit criterion, only by the end
 * of its time slice.
 *
 * One instance per simulation — the queue is state. `availablePolicies()`
 * already returns fresh instances on every call.
 */
export class RoundRobinPolicy implements SchedulingPolicy {
  readonly name = 'Round-Robin with quantum, without priority';
  readonly preemptive = false;
  readonly usesQuantum = true;

  private readonly queue = new CircularQueue();

  sort(context: SelectionContext): readonly Process[] {
    this.queue.sync(context.ready);
    return [...context.ready].sort(
      (first, second) => this.queue.position(first) - this.queue.position(second),
    );
  }

  /**
   * Only processes created at the same instant and still unexecuted are tied —
   * for everything else the queue already defines a total order.
   *
   * This is what keeps the rotation alive: whoever has just used up its quantum
   * sits alone at the end of the queue, never joins the tied group and is
   * therefore never reached by the assignment's rule (i), "keep whoever already
   * holds the processor", which would hand the CPU back to it indefinitely. For
   * the ties that remain — simultaneous creation — the assignment's rule
   * decides as usual.
   */
  areTied(first: Process, second: Process): boolean {
    return this.queue.sameBatch(first, second);
  }

  onQuantumEnd(_context: SelectionContext, chosen: Process): void {
    this.queue.markQuantumEnd(chosen);
  }
}
