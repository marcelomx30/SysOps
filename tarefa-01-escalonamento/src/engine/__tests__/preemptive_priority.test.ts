import { describe, expect, it } from 'vitest';
import { PreemptivePriorityPolicy } from '../policies/preemptive_priority';
import { simulate } from '../simulator';
import type { Configuration, ProcessInput, SimulationResult } from '../types';

/** Assignment example: P1(0,5,2) P2(0,2,3) P3(1,4,1) P4(3,3,4). */
const EXAMPLE: ProcessInput[] = [
  { creationTime: 0, duration: 5, priority: 2 },
  { creationTime: 0, duration: 2, priority: 3 },
  { creationTime: 1, duration: 4, priority: 1 },
  { creationTime: 3, duration: 3, priority: 4 },
];

const CONFIGURATION: Configuration = { quantum: 2, aging: 1 };

/** Fixed random pick: keeps the tests deterministic if rule (iii) is reached. */
const fixedRandomPicker = () => 0;

/** CPU occupancy sequence, one id per second — readable in the test. */
function cpuOccupancy(result: SimulationResult): (number | null)[] {
  return result.timeline.map((slice) => slice.running);
}

describe('Priority (preemptive)', () => {
  const result = simulate(EXAMPLE, CONFIGURATION, new PreemptivePriorityPolicy(), fixedRandomPicker);

  it('always runs the ready process with the lowest priority number', () => {
    // t=1: P3 (1) preempts P1 (2). t=5: P1 (2) > P2 (3) > P4 (4).
    expect(cpuOccupancy(result)).toEqual([1, 3, 3, 3, 3, 1, 1, 1, 1, 2, 2, 4, 4, 4]);
  });

  it('produces the hand-calculated metrics for the assignment example', () => {
    // Turnaround: P1 9, P2 11, P3 4, P4 11. Waiting: P1 4, P2 9, P3 0, P4 8.
    expect(result.averageTurnaroundTime).toBe(8.75);
    expect(result.averageWaitingTime).toBe(5.25);
    expect(result.contextSwitches).toBe(4);
  });

  it('preempts the running process when a higher-priority one arrives', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 4, priority: 3 },
      { creationTime: 1, duration: 2, priority: 1 },
    ];
    const preemptionResult = simulate(
      input,
      CONFIGURATION,
      new PreemptivePriorityPolicy(),
      fixedRandomPicker,
    );
    // P2 arrives at t=1 with priority 1 < 3, takes the CPU and only gives it back at the end.
    expect(cpuOccupancy(preemptionResult)).toEqual([1, 2, 2, 1, 1, 1]);
    expect(preemptionResult.contextSwitches).toBe(2);
  });

  it('does not preempt when a lower-priority process arrives', () => {
    // P4 (priority 4) arrives at t=3 while P3 (priority 1) runs.
    expect(result.timeline[3].running).toBe(3);
  });

  it('keeps the current process on a priority tie, avoiding a context switch', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 3, priority: 2 },
      { creationTime: 1, duration: 1, priority: 2 },
    ];
    const tieResult = simulate(input, CONFIGURATION, new PreemptivePriorityPolicy(), fixedRandomPicker);
    // P2 ties on priority and has less remaining time (1 < 2), but rule (i) keeps P1.
    expect(cpuOccupancy(tieResult)).toEqual([1, 1, 1, 2]);
    expect(tieResult.contextSwitches).toBe(1);
  });
});
