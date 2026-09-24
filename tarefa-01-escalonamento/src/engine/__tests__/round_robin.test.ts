import { describe, expect, it } from 'vitest';
import { RoundRobinPolicy } from '../policies/round_robin';
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
const fixedRandomPicker = () => 0;

function cpuOccupancy(result: SimulationResult): (number | null)[] {
  return result.timeline.map((slice) => slice.running);
}

describe('Round-Robin with quantum', () => {
  const result = simulate(EXAMPLE, CONFIGURATION, new RoundRobinPolicy(), fixedRandomPicker);

  it('runs the assignment example with quantum:2', () => {
    // P1 and P2 are created together and tie in the queue: the assignment's
    // rule gives the CPU to the shortest remaining one (P2), which finishes
    // inside the first quantum. From there the queue rotates every 2 seconds.
    expect(cpuOccupancy(result)).toEqual([2, 2, 1, 1, 3, 3, 4, 4, 1, 1, 3, 3, 4, 1]);
  });

  it('produces the hand-checked metrics for the assignment example', () => {
    // Completions: P1=14, P2=2, P3=12, P4=13.
    // tt: 14, 2, 11, 10 -> 37/4. tw = tt - duration: 9, 0, 7, 7 -> 23/4.
    expect(result.averageTurnaroundTime).toBe(9.25);
    expect(result.averageWaitingTime).toBe(5.75);
    expect(result.contextSwitches).toBe(7);
  });

  it('gives the CPU back at the end of each quantum, in rotation', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 6, priority: 1 },
      { creationTime: 0, duration: 6, priority: 1 },
      { creationTime: 0, duration: 6, priority: 1 },
    ];
    const rotation = simulate(input, CONFIGURATION, new RoundRobinPolicy(), fixedRandomPicker);
    expect(cpuOccupancy(rotation)).toEqual([1, 1, 2, 2, 3, 3, 1, 1, 2, 2, 3, 3, 1, 1, 2, 2, 3, 3]);
  });

  it('does not interrupt a process mid-quantum when another is created', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 4, priority: 1 },
      { creationTime: 1, duration: 2, priority: 1 },
    ];
    const midQuantum = simulate(input, CONFIGURATION, new RoundRobinPolicy(), fixedRandomPicker);
    // P2 is created at t=1, inside P1's [0,2) slice, and only gets the CPU at t=2.
    expect(cpuOccupancy(midQuantum)).toEqual([1, 1, 2, 2, 1, 1]);
  });

  it('puts a newly created process ahead of the one that just used up its quantum', () => {
    // Acceptance criterion of #10. P3 is created exactly at t=2, the instant
    // P1 uses up its quantum: the queue becomes [P2, P3, P1], not [P2, P1, P3].
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 6, priority: 1 },
      { creationTime: 0, duration: 6, priority: 1 },
      { creationTime: 2, duration: 6, priority: 1 },
    ];
    const arrival = simulate(input, CONFIGURATION, new RoundRobinPolicy(), fixedRandomPicker);
    // At t=4 the newcomer P3 runs. Under the opposite convention P1 would.
    expect(cpuOccupancy(arrival).slice(0, 6)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('does not carry the queue from one simulation into the next', () => {
    const policy = new RoundRobinPolicy();
    const first = simulate(EXAMPLE, CONFIGURATION, policy, fixedRandomPicker);
    const second = simulate(EXAMPLE, CONFIGURATION, policy, fixedRandomPicker);
    expect(cpuOccupancy(second)).toEqual(cpuOccupancy(first));
  });
});
