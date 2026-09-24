/** Public entry point of the engine, consumed by the CLI and the web interface. */
export { parseConfiguration, parseProcesses } from './parser';
export { simulate } from './simulator';
export type { RandomPicker } from './simulator';
export type { SchedulingPolicy } from './scheduling_policy';
export * from './types';

import { FirstComeFirstServePolicy } from './policies/first_come_first_serve';
import { ShortestJobFirstPolicy } from './policies/shortest_job_first';
import { ShortestRemainingTimeFirstPolicy } from './policies/shortest_remaining_time_first';
import type { SchedulingPolicy } from './scheduling_policy';

/**
 * Available policies, in the order the assignment lists them.
 *
 * Workstreams B and C register the four remaining algorithms here (priority
 * with and without preemption, and the two round-robins) as they are implemented.
 */
export function availablePolicies(): SchedulingPolicy[] {
  return [
    new FirstComeFirstServePolicy(),
    new ShortestJobFirstPolicy(),
    new ShortestRemainingTimeFirstPolicy(),
  ];
}
