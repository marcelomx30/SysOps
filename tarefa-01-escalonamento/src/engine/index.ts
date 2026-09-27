/** Public entry point of the engine, consumed by the CLI and the web interface. */
export { parseConfiguration, parseProcesses } from './parser';
export { simulate } from './simulator';
export type { RandomPicker } from './simulator';
export type { SchedulingPolicy } from './scheduling_policy';
export * from './types';

import { FirstComeFirstServePolicy } from './policies/first_come_first_serve';
import { NonPreemptivePriorityPolicy } from './policies/non_preemptive_priority';
import { PreemptivePriorityPolicy } from './policies/preemptive_priority';
import { ShortestJobFirstPolicy } from './policies/shortest_job_first';
import { RoundRobinPriorityPolicy } from './policies/round_robin_priority';
import { RoundRobinPolicy } from './policies/round_robin';
import { ShortestRemainingTimeFirstPolicy } from './policies/shortest_remaining_time_first';
import type { SchedulingPolicy } from './scheduling_policy';

/**
 * Available policies, in the order the assignment lists them.
 *
 * The round-robin policies keep the ready queue as internal state, which is
 * why this function returns fresh instances on every call: one of its results
 * cannot be reused across two simulations.
 */
export function availablePolicies(): SchedulingPolicy[] {
  return [
    new FirstComeFirstServePolicy(),
    new ShortestJobFirstPolicy(),
    new ShortestRemainingTimeFirstPolicy(),
    new NonPreemptivePriorityPolicy(),
    new PreemptivePriorityPolicy(),
    new RoundRobinPolicy(),
    new RoundRobinPriorityPolicy(),
  ];
}
