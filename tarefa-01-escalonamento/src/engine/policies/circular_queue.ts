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
  /**
   * `position` is the place in line; `batch` identifies processes that entered
   * together and stays meaningful while they have not run. A process that has
   * already given the CPU back has `batch: null` — it is alone in its position
   * and never ties with anyone.
   */
  private readonly entries = new Map<Process, { position: number; batch: number | null }>();
  private nextPosition = 0;
  private awaitingRequeue: Process | null = null;

  /**
   * Brings the queue up to date with the ready set of the current instant.
   *
   * The order of the three steps is this class's design decision:
   *
   * 1. leave: whoever is no longer ready (finished, or processes left over
   *    from a previous simulation);
   * 2. enter: the newly created ones, sorted by creation instant — not by the
   *    order they show up here, because `sort()` is only called when the CPU is
   *    reevaluated and more than one process may have been created between two
   *    calls;
   * 3. back of the line: whoever used up its quantum.
   *
   * Step 3 coming after step 2 is the convention the team adopted for #10's
   * acceptance criterion: a process created at the very instant another uses up
   * its quantum joins the queue ahead of the preempted one. It is the classic
   * round-robin convention — whoever gives the CPU back goes to the end of a
   * queue that already includes the new arrivals.
   */
  sync(ready: readonly Process[]): void {
    const present = new Set(ready);

    for (const process of this.entries.keys()) {
      if (!present.has(process)) this.entries.delete(process);
    }

    const newcomers = ready
      .filter((process) => !this.entries.has(process))
      .sort((first, second) => first.creationTime - second.creationTime);
    for (const process of newcomers) {
      this.enqueue(process, process.creationTime);
    }

    if (this.awaitingRequeue !== null) {
      const preempted = this.awaitingRequeue;
      this.awaitingRequeue = null;
      // If it finished within the quantum it already left in step 1 and does
      // not rejoin the queue.
      if (present.has(preempted)) this.enqueue(preempted, null);
    }
  }

  /**
   * Marks that `process` used up its quantum and must go to the end of the queue.
   *
   * The repositioning is deliberately deferred to the next `sync()`: the loop
   * calls `onQuantumEnd` at the end of the previous second, before admitting
   * the processes created in the following second. Deferring is what lets an
   * arrival join the queue ahead of the preempted process.
   */
  markQuantumEnd(process: Process): void {
    this.awaitingRequeue = process;
  }

  /** Place in line; the smaller, the closer to the CPU. */
  position(process: Process): number {
    return this.entries.get(process)?.position ?? Number.MAX_SAFE_INTEGER;
  }

  /**
   * Tells whether both processes entered the queue together and neither has
   * held the CPU yet — the only case the queue cannot order on its own, where
   * the assignment's tie-breaking rule has to decide.
   */
  sameBatch(first: Process, second: Process): boolean {
    if (first === second) return true;
    const firstBatch = this.entries.get(first)?.batch ?? null;
    const secondBatch = this.entries.get(second)?.batch ?? null;
    return firstBatch !== null && firstBatch === secondBatch;
  }

  private enqueue(process: Process, batch: number | null): void {
    this.entries.set(process, { position: this.nextPosition, batch });
    this.nextPosition += 1;
  }
}
