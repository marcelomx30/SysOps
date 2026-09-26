import { describe, expect, it } from 'vitest';
import { NonPreemptivePriorityPolicy } from '../policies/non_preemptive_priority';
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

describe('Priority (non-preemptive)', () => {
  const result = simulate(
    EXAMPLE,
    CONFIGURATION,
    new NonPreemptivePriorityPolicy(),
    fixedRandomPicker,
  );

  it('chooses the ready process with the lowest priority number', () => {
    // t=0: P1 (2) beats P2 (3). t=5: P3 (1) > P2 (3) > P4 (4).
    expect(cpuOccupancy(result)).toEqual([1, 1, 1, 1, 1, 3, 3, 3, 3, 2, 2, 4, 4, 4]);
  });

  it('produces the hand-calculated metrics for the assignment example', () => {
    // Turnaround: P1 5, P2 11, P3 8, P4 11. Waiting: P1 0, P2 9, P3 4, P4 8.
    expect(result.averageTurnaroundTime).toBe(8.75);
    expect(result.averageWaitingTime).toBe(5.25);
    expect(result.contextSwitches).toBe(3);
  });

  it('lets the chosen process run until the end when a more prioritary one arrives', () => {
    // P3 (priority 1) arrives at t=1, during P1's execution, and does not take the CPU.
    expect(result.timeline.slice(1, 5).map((slice) => slice.running)).toEqual([1, 1, 1, 1]);
  });

  it('breaks a priority tie by the shortest remaining time', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 4, priority: 2 },
      { creationTime: 0, duration: 1, priority: 2 },
    ];
    const tieResult = simulate(input, CONFIGURATION, new NonPreemptivePriorityPolicy(), fixedRandomPicker);
    expect(cpuOccupancy(tieResult)).toEqual([2, 1, 1, 1, 1]);
  });
});
