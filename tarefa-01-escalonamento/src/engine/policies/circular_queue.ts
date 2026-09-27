import type { Process } from '../types';

/**
 * Ready queue of the round-robin algorithms.
 *
 * The `SchedulingPolicy` interface only hands over the ready set of the
 * current instant, always in the order the input was read — it carries no
 * notion of "next in line". The circular order is therefore policy state, and
 * this object is what holds it. It lives in a separate class because both
 * round-robins in the assignment (#10 and #11) need exactly the same queue.
 *
 * Entries are keyed by the `Process` object, not by its id: every call to
 * `simulate()` creates fresh processes, so a policy instance reused across two
 * simulations drops the stale queue on the first sync instead of mixing them.
 */
export class CircularQueue {
  /** Place in line of every queued process; the smaller, the closer to the CPU. */
  private readonly positions = new Map<Process, number>();
  private nextPosition = 0;
  private awaitingRequeue: Process | null = null;

  /**
   * Brings the queue up to date with the ready set of the current instant.
   *
   * The order of the three steps is this class's design decision:
   *
   * 1. leave: whoever is no longer ready (finished, or processes left over
   *    from a previous simulation);
   * 2. enter: the newly created ones, sorted by creation instant and then by
   *    input order — not by the order they show up here, because `sort()` is
   *    only called when the CPU is reevaluated and more than one process may
   *    have been created between two calls;
   * 3. back of the line: whoever used up its time slice.
   *
   * Input order as the second key is what the assignment's own time diagram
   * does: P1 and P2 are both created at t=0 and P1 runs first. Processes created
   * at the same instant are therefore never tied in the queue, and the
   * assignment's tie-breaking rule is not needed to order them.
   *
   * Step 3 coming after step 2 is the convention the team adopted for #10's
   * acceptance criterion: a process created at the very instant another uses up
   * its quantum joins the queue ahead of the preempted one. It is the classic
   * round-robin convention — whoever gives the CPU back goes to the end of a
   * queue that already includes the new arrivals.
   */
  sync(ready: readonly Process[]): void {
    const present = new Set(ready);

    for (const process of this.positions.keys()) {
      if (!present.has(process)) this.positions.delete(process);
    }

    const newcomers = ready
      .filter((process) => !this.positions.has(process))
      .sort((first, second) => first.creationTime - second.creationTime || first.id - second.id);
    for (const process of newcomers) {
      this.enqueue(process);
    }

    if (this.awaitingRequeue !== null) {
      const preempted = this.awaitingRequeue;
      this.awaitingRequeue = null;
      // If it finished within the slice it already left in step 1 and does
      // not rejoin the queue.
      if (present.has(preempted)) this.enqueue(preempted);
    }
  }

  /**
   * Marks that `process` ended its time slice and must go to the end of the queue.
   *
   * The repositioning is deliberately deferred to the next `sync()`: the loop
   * calls `onSliceEnd` at the end of the previous second, before admitting
   * the processes created in the following second. Deferring is what lets an
   * arrival join the queue ahead of the preempted process.
   */
  markSliceEnd(process: Process): void {
    this.awaitingRequeue = process;
  }

  /** Place in line; the smaller, the closer to the CPU. */
  position(process: Process): number {
    return this.positions.get(process) ?? Number.MAX_SAFE_INTEGER;
  }

  private enqueue(process: Process): void {
    this.positions.set(process, this.nextPosition);
    this.nextPosition += 1;
  }
}
