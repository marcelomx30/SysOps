import { describe, expect, it } from 'vitest';
import { RoundRobinPriorityPolicy } from '../policies/round_robin_priority';
import { simulate } from '../simulator';
import type { Configuration, Process, ProcessInput, SimulationResult } from '../types';

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

function buildProcess(id: number, priority: number): Process {
  return {
    id,
    creationTime: 0,
    duration: 4,
    staticPriority: priority,
    dynamicPriority: priority,
    remainingTime: 4,
    status: 'ready',
    firstExecutionTime: null,
    completionTime: null,
  };
}

describe('Round-Robin with priority and aging', () => {
  const result = simulate(
    EXAMPLE,
    CONFIGURATION,
    new RoundRobinPriorityPolicy(),
    fixedRandomPicker,
  );

  it('runs the assignment example with quantum:2 and aging:1', () => {
    expect(cpuOccupancy(result)).toEqual([1, 1, 3, 3, 2, 2, 1, 1, 3, 3, 4, 4, 1, 4]);
  });

  it('produces the hand-checked metrics for the assignment example', () => {
    // Completions: P1=13, P2=6, P3=10, P4=14.
    // tt: 13, 6, 9, 11 -> 39/4. tw = tt - duration: 8, 4, 5, 8 -> 25/4.
    expect(result.averageTurnaroundTime).toBe(9.75);
    expect(result.averageWaitingTime).toBe(6.25);
    expect(result.contextSwitches).toBe(7);
  });

  it('does not preempt by priority: the running process completes its quantum', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 4, priority: 5 },
      { creationTime: 1, duration: 4, priority: 1 },
    ];
    const noPreemption = simulate(
      input,
      CONFIGURATION,
      new RoundRobinPriorityPolicy(),
      fixedRandomPicker,
    );

    // P2 is created at t=1 with priority 1, far above P1's 5, and still does
    // not take the CPU: P1 finishes its slice and only hands over at t=2.
    expect(cpuOccupancy(noPreemption).slice(0, 3)).toEqual([1, 1, 2]);
  });

  it('aging prevents the starvation of the least prioritary process', () => {
    // P1 is long and prioritary; without aging P2 would only run at the end.
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 20, priority: 1 },
      { creationTime: 0, duration: 4, priority: 5 },
    ];

    const withoutAging = simulate(
      input,
      { quantum: 2, aging: 0 },
      new RoundRobinPriorityPolicy(),
      fixedRandomPicker,
    );
    const withAging = simulate(
      input,
      { quantum: 2, aging: 1 },
      new RoundRobinPriorityPolicy(),
      fixedRandomPicker,
    );

    // Without aging, P2 waits out P1's 20 seconds. With aging 1, four quanta
    // are enough for its dynamic priority to reach P1's (5 -> 1).
    expect(cpuOccupancy(withoutAging).indexOf(2)).toBe(20);
    expect(cpuOccupancy(withAging).indexOf(2)).toBe(8);
  });

  it('ages whoever waited and restores the priority of whoever was served', () => {
    const policy = new RoundRobinPriorityPolicy();
    const served = buildProcess(1, 2);
    const waiting = buildProcess(2, 5);
    // Dynamic priority already lowered by a previous quantum.
    served.dynamicPriority = 0;

    policy.onQuantumEnd(
      {
        ready: [served, waiting],
        running: served,
        quantumUsed: 2,
        instant: 1,
        configuration: CONFIGURATION,
      },
      served,
    );

    // Aging means subtracting: the scale is inverted, waiting moves the
    // process towards the top.
    expect(waiting.dynamicPriority).toBe(4);
    expect(served.dynamicPriority).toBe(served.staticPriority);
  });
});
