import {
  availablePolicies,
  simulate,
  type Configuration,
  type ProcessInput,
  type SimulationResult,
} from '../engine';
import { formatDiagram } from './diagram';

/** Decimal places of the averages. Integers print as "7.50", not "7.5". */
const DECIMALS = 2;

/**
 * Output block of one algorithm: the four pieces of information the assignment
 * requires on stdout, in the order it lists them.
 *
 * The labels are in Portuguese on purpose — they are the printed output, graded
 * against the assignment, not code.
 */
export function formatResult(result: SimulationResult, processCount: number): string {
  return [
    `=== ${result.algorithm} ===`,
    `tempo médio de vida (tt):   ${result.averageTurnaroundTime.toFixed(DECIMALS)}`,
    `tempo médio de espera (tw): ${result.averageWaitingTime.toFixed(DECIMALS)}`,
    `trocas de contexto:         ${result.contextSwitches}`,
    '',
    formatDiagram(result.timeline, processCount),
  ].join('\n');
}

/**
 * Runs the input through every registered algorithm and returns the simulator's
 * complete standard output.
 *
 * Walks `availablePolicies()` instead of a list of its own: the CLI knows no
 * algorithm, only the engine — the same one the web interface uses. Registering
 * a new policy in the engine is enough for it to show up here.
 */
export function formatReport(
  input: readonly ProcessInput[],
  configuration: Configuration,
): string {
  const blocks = availablePolicies().map((policy) =>
    formatResult(simulate(input, configuration, policy), input.length),
  );

  return `${blocks.join('\n\n')}\n`;
}
