import type {
  Process,
  ProcessMetrics,
  SimulationResult,
  TimeSlice,
} from './types';

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Derives the metrics required by the assignment at the end of a simulation.
 *
 * The times come from the instants recorded in the processes themselves during
 * the loop, and not from a recount of the timeline, so that all seven policies
 * use exactly the same calculation.
 */
export function calculateMetrics(
  algorithm: string,
  processes: readonly Process[],
  timeline: readonly TimeSlice[],
  contextSwitches: number,
): SimulationResult {
  const perProcess: ProcessMetrics[] = processes.map((process) => {
    if (process.completionTime === null || process.firstExecutionTime === null) {
      throw new Error(
        `Processo P${process.id} não finalizou: termino=${process.completionTime}, ` +
          `primeiraExecucao=${process.firstExecutionTime}. ` +
          `Esperado: ambos preenchidos ao fim da simulação.`,
      );
    }
    const turnaroundTime = process.completionTime - process.creationTime;
    return {
      id: process.id,
      turnaroundTime,
      waitingTime: turnaroundTime - process.duration,
      responseTime: process.firstExecutionTime - process.creationTime,
    };
  });

  return {
    algorithm,
    timeline,
    perProcess,
    averageTurnaroundTime: average(perProcess.map((metrics) => metrics.turnaroundTime)),
    averageWaitingTime: average(perProcess.map((metrics) => metrics.waitingTime)),
    contextSwitches,
  };
}
