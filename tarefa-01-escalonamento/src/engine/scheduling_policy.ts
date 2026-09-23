import type { Configuration, Process } from './types';

/**
 * Context handed to the policy at every second of simulation.
 */
export interface SelectionContext {
  /** Created and unfinished processes, candidates for the CPU. */
  readonly ready: readonly Process[];
  /** Who held the CPU in the previous second, or `null` if idle. */
  readonly running: Process | null;
  /** Consecutive seconds `running` has already accumulated in the current slice. */
  readonly quantumUsed: number;
  readonly instant: number;
  readonly configuration: Configuration;
}

/**
 * A scheduling strategy.
 *
 * Strategy pattern: the simulation loop is written only once and each of the
 * seven algorithms in the assignment comes in here as a different
 * implementation. This way the context switch count, the timeline recording
 * and the tie-breaking rule are not rewritten seven times.
 */
export interface SchedulingPolicy {
  readonly name: string;

  /**
   * Sorts the candidates from most to least suitable to occupy the CPU.
   *
   * The policy does **not** decide alone: the loop applies the assignment's
   * tie-breaking rule over the tied ones at the top. That is why the policy
   * exposes an order and a tie criterion, instead of simply returning a process.
   */
  sort(context: SelectionContext): readonly Process[];

  /**
   * Indicates whether two processes are tied by this policy's criterion.
   *
   * The loop uses this to find the range of tied processes at the top of the
   * sorting and then break the tie as the assignment specifies.
   */
  areTied(first: Process, second: Process, context: SelectionContext): boolean;

  /**
   * If `true`, a running process can lose the CPU before finishing.
   * Non-preemptive algorithms hold the CPU until the process finishes.
   */
  readonly preemptive: boolean;

  /**
   * State adjustment at the end of each quantum. Only the aging algorithm
   * uses it; the others inherit the empty behavior.
   */
  onQuantumEnd?(context: SelectionContext, chosen: Process): void;

  /**
   * If `true`, the CPU is reevaluated every `quantum` seconds even if the
   * process has not finished. This is what characterizes round-robin algorithms.
   */
  readonly usesQuantum: boolean;
}
