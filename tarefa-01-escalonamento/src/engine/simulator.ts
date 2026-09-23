import type { SchedulingPolicy, SelectionContext } from './scheduling_policy';
import { calculateMetrics } from './metrics';
import type {
  Configuration,
  Process,
  ProcessInput,
  SimulationResult,
  TimeSlice,
} from './types';

/** Injectable source of randomness, so that tests are deterministic. */
export type RandomPicker = (count: number) => number;

const defaultRandomPicker: RandomPicker = (count) => Math.floor(Math.random() * count);

/** Safety ceiling: prevents an infinite loop if a policy never finishes. */
const INSTANT_LIMIT = 100_000;

/** Converts the raw input into processes with initialized control state. */
function createProcesses(input: readonly ProcessInput[]): Process[] {
  return input.map((data, index) => ({
    id: index + 1,
    creationTime: data.creationTime,
    duration: data.duration,
    staticPriority: data.priority,
    dynamicPriority: data.priority,
    remainingTime: data.duration,
    status: 'not-created' as const,
    firstExecutionTime: null,
    completionTime: null,
  }));
}

/**
 * Applies the assignment's tie-breaking rule over the tied candidates at the top.
 *
 * Required order: (i) the process that already holds the processor, to avoid a
 * context switch; (ii) the one with the shortest remaining time; (iii) random choice.
 */
function breakTie(
  tied: readonly Process[],
  running: Process | null,
  pickRandom: RandomPicker,
): Process {
  if (tied.length === 1) return tied[0];

  // (i) keeps whoever is already on the CPU
  const current = tied.find((candidate) => running !== null && candidate.id === running.id);
  if (current !== undefined) return current;

  // (ii) shortest remaining time
  const shortestRemaining = Math.min(...tied.map((candidate) => candidate.remainingTime));
  const withShortestRemaining = tied.filter(
    (candidate) => candidate.remainingTime === shortestRemaining,
  );
  if (withShortestRemaining.length === 1) return withShortestRemaining[0];

  // (iii) random choice among those still tied
  return withShortestRemaining[pickRandom(withShortestRemaining.length)];
}

/** Selects the process that will occupy the CPU in this second. */
function selectProcess(
  policy: SchedulingPolicy,
  context: SelectionContext,
  pickRandom: RandomPicker,
): Process {
  const sorted = policy.sort(context);
  const leader = sorted[0];
  const tied = sorted.filter((candidate) => policy.areTied(candidate, leader, context));
  return breakTie(tied, context.running, pickRandom);
}

/**
 * Decides whether the process on the CPU keeps it in this second.
 *
 * A process is only reevaluated when the policy is preemptive or when it has
 * used up its quantum. Outside these cases it continues until it finishes,
 * which is exactly what defines the cooperative (non-preemptive) algorithms.
 */
function keepsCpu(
  policy: SchedulingPolicy,
  running: Process | null,
  quantumUsed: number,
  configuration: Configuration,
): boolean {
  if (running === null || running.remainingTime === 0) return false;
  if (policy.usesQuantum && quantumUsed >= configuration.quantum) return false;
  return !policy.preemptive;
}

/**
 * Runs the simulation of a set of processes under a policy.
 *
 * Time advances in discrete steps of 1 second, as the assignment's diagram
 * requires. At each step: admits the processes that arrived, chooses who
 * occupies the CPU, executes for 1 second and records the slice in the timeline.
 *
 * @example
 * const result = simulate(
 *   [{ creationTime: 0, duration: 5, priority: 2 }],
 *   { quantum: 2, aging: 1 },
 *   new FirstComeFirstServePolicy(),
 * );
 * console.log(result.averageTurnaroundTime); // 5
 */
export function simulate(
  input: readonly ProcessInput[],
  configuration: Configuration,
  policy: SchedulingPolicy,
  pickRandom: RandomPicker = defaultRandomPicker,
): SimulationResult {
  const processes = createProcesses(input);
  const timeline: TimeSlice[] = [];

  let instant = 0;
  let running: Process | null = null;
  // Last process to occupy the CPU, even if already finished. Unlike
  // `running`, which is cleared on completion: without this, the switch that
  // follows a finished process would not be counted.
  let lastOccupant: Process | null = null;
  let quantumUsed = 0;
  let contextSwitches = 0;

  while (processes.some((process) => process.status !== 'finished')) {
    if (instant > INSTANT_LIMIT) {
      throw new Error(
        `Simulação de "${policy.name}" excedeu ${INSTANT_LIMIT} instantes — ` +
          `provável laço infinito na política.`,
      );
    }

    // Admits whoever arrived at this instant.
    for (const process of processes) {
      if (process.status === 'not-created' && process.creationTime <= instant) {
        process.status = 'ready';
      }
    }

    const ready = processes.filter(
      (process) => process.status === 'ready' || process.status === 'running',
    );

    if (ready.length === 0) {
      // Idle CPU: no process created yet. Advances without recording a switch.
      timeline.push({ instant, running: null, ready: [] });
      running = null;
      quantumUsed = 0;
      instant += 1;
      continue;
    }

    const context: SelectionContext = {
      ready,
      running,
      quantumUsed,
      instant,
      configuration,
    };

    const chosen: Process =
      running !== null && keepsCpu(policy, running, quantumUsed, configuration)
        ? running
        : selectProcess(policy, context, pickRandom);

    // A context switch only counts when the CPU occupant actually changes.
    if (lastOccupant !== null && lastOccupant.id !== chosen.id) {
      contextSwitches += 1;
    }
    if (running !== null && running.id !== chosen.id) {
      running.status = 'ready';
    }

    quantumUsed = running !== null && running.id === chosen.id ? quantumUsed : 0;

    if (chosen.firstExecutionTime === null) chosen.firstExecutionTime = instant;
    chosen.status = 'running';

    timeline.push({
      instant,
      running: chosen.id,
      ready: ready.filter((process) => process.id !== chosen.id).map((process) => process.id),
    });

    chosen.remainingTime -= 1;
    quantumUsed += 1;
    lastOccupant = chosen;
    instant += 1;

    if (policy.usesQuantum && quantumUsed >= configuration.quantum) {
      policy.onQuantumEnd?.(context, chosen);
    }

    if (chosen.remainingTime === 0) {
      chosen.status = 'finished';
      chosen.completionTime = instant;
      running = null;
      quantumUsed = 0;
    } else {
      running = chosen;
    }
  }

  return calculateMetrics(policy.name, processes, timeline, contextSwitches);
}
