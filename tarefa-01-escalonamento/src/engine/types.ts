/**
 * Shared contract between the simulation engine, the CLI and the web interface.
 *
 * This file is the coupling point of the three workstreams: any change here
 * affects everyone and must be agreed with the group first.
 */

/**
 * State of a process throughout the simulation.
 *
 * `not-created` covers the interval before the creation instant — it is what
 * produces the empty cells on the left of the assignment's time diagram.
 */
export type ProcessStatus = 'not-created' | 'ready' | 'running' | 'finished';

/**
 * A process and its control state during the simulation.
 *
 * The assignment explicitly asks for a structure that maps control
 * information (id, status, priority) — this is it, and it is described in the
 * implementation decisions document.
 */
export interface Process {
  /** Sequential identifier assigned when reading: 1 becomes "P1" in the diagram. */
  readonly id: number;
  /** Creation instant, in seconds, read from the input. */
  readonly creationTime: number;
  /** Total CPU time required, in seconds. Does not change during the simulation. */
  readonly duration: number;
  /** Static priority read from the input. Lower number = higher priority. */
  readonly staticPriority: number;

  /** Current priority. Only differs from the static one in the aging algorithm. */
  dynamicPriority: number;
  /** CPU seconds still required. Decrements for every second executed. */
  remainingTime: number;
  status: ProcessStatus;

  /** Instant it first received the CPU; `null` while it has not executed. */
  firstExecutionTime: number | null;
  /** Instant it finished; `null` while it has not finished. */
  completionTime: number | null;
}

/** Parameters read from the plain text configuration file. */
export interface Configuration {
  /** Time slice of the round-robin algorithms, in seconds. */
  readonly quantum: number;
  /** Priority increment per quantum in the aging algorithm. */
  readonly aging: number;
}

/**
 * What happened during one second of simulation — the unit of the time diagram.
 *
 * One record per elapsed second. This is the single data source for both the
 * CLI's textual diagram and the web interface's animation, which guarantees
 * that the two outputs never diverge.
 */
export interface TimeSlice {
  /** Start of the slice. The slice covers the interval [instant, instant + 1). */
  readonly instant: number;
  /** Process that occupied the CPU, or `null` if the CPU was idle. */
  readonly running: number | null;
  /** Created and unfinished processes that were waiting for the CPU in this slice. */
  readonly ready: readonly number[];
}

/** Metrics of an individual process, derived at the end of the simulation. */
export interface ProcessMetrics {
  readonly id: number;
  /** Turnaround time: completion − creation. */
  readonly turnaroundTime: number;
  /** Waiting time: turnaround − duration. How long it was ready without running. */
  readonly waitingTime: number;
  /** Response time: first execution − creation. */
  readonly responseTime: number;
}

/** Complete result of running one algorithm over one input. */
export interface SimulationResult {
  readonly algorithm: string;
  /** Second-by-second timeline, in chronological order. */
  readonly timeline: readonly TimeSlice[];
  readonly perProcess: readonly ProcessMetrics[];
  /** Average turnaround time (tt), required in the output. */
  readonly averageTurnaroundTime: number;
  /** Average waiting time (tw), required in the output. */
  readonly averageWaitingTime: number;
  /** Context switches, required in the output. */
  readonly contextSwitches: number;
}

/** Process data as it comes from the input, before becoming a `Process`. */
export interface ProcessInput {
  readonly creationTime: number;
  readonly duration: number;
  readonly priority: number;
}
