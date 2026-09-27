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

  it('reproduces the time diagram of the assignment with quantum:2', () => {
    // P1 and P2 are created together and enter the queue in input order, so P1
    // runs first — exactly the diagram on page 2 of the assignment.
    expect(cpuOccupancy(result)).toEqual([1, 1, 2, 2, 3, 3, 1, 1, 4, 4, 3, 3, 1, 4]);
  });

  it('produces the hand-checked metrics for the assignment example', () => {
    // Completions: P1=13, P2=4, P3=12, P4=14.
    // tt: 13, 4, 11, 11 -> 39/4. tw = tt - duration: 8, 2, 7, 8 -> 25/4.
    expect(result.averageTurnaroundTime).toBe(9.75);
    expect(result.averageWaitingTime).toBe(6.25);
    expect(result.contextSwitches).toBe(7);
  });

  it('orders processes created at the same instant by input order, not remaining time', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 5, priority: 1 },
      { creationTime: 0, duration: 1, priority: 1 },
    ];
    const simultaneous = simulate(input, CONFIGURATION, new RoundRobinPolicy(), () => 1);
    expect(cpuOccupancy(simultaneous)).toEqual([1, 1, 2, 1, 1, 1]);
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
