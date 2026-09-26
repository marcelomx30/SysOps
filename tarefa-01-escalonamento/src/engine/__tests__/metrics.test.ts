import { describe, expect, it } from 'vitest';
import { availablePolicies } from '../index';
import { FirstComeFirstServePolicy } from '../policies/first_come_first_serve';
import { simulate } from '../simulator';
import type { Configuration, ProcessInput } from '../types';

/** Assignment example: P1(0,5,2) P2(0,2,3) P3(1,4,1) P4(3,3,4). */
const EXAMPLE: ProcessInput[] = [
  { creationTime: 0, duration: 5, priority: 2 },
  { creationTime: 0, duration: 2, priority: 3 },
  { creationTime: 1, duration: 4, priority: 1 },
  { creationTime: 3, duration: 3, priority: 4 },
];

const CONFIGURATION: Configuration = { quantum: 2, aging: 1 };
const fixedRandomPicker = () => 0;

describe('per-process metrics', () => {
  const result = simulate(
    EXAMPLE,
    CONFIGURATION,
    new FirstComeFirstServePolicy(),
    fixedRandomPicker,
  );

  it('reproduces the hand-checked values for the assignment example', () => {
    // FCFS: 1 1 1 1 1 2 2 3 3 3 3 4 4 4
    // Completions: P1=5, P2=7, P3=11, P4=14.
    expect(result.perProcess).toEqual([
      { id: 1, turnaroundTime: 5, waitingTime: 0, responseTime: 0 },
      { id: 2, turnaroundTime: 7, waitingTime: 5, responseTime: 5 },
      { id: 3, turnaroundTime: 10, waitingTime: 6, responseTime: 6 },
      { id: 4, turnaroundTime: 11, waitingTime: 8, responseTime: 8 },
    ]);
  });

  it('reports the averages required in the output', () => {
    expect(result.averageTurnaroundTime).toBe(8.25); // 33/4
    expect(result.averageWaitingTime).toBe(4.75); // 19/4
  });
});

describe('consistency between turnaround and waiting time', () => {
  // Both come from the timeline through independent paths: turnaround from the
  // process's last second of execution, waiting time from counting the seconds
  // it showed up as ready. The identity below only holds if both readings —
  // and therefore the diagram the CLI prints — are correct.
  for (const policy of availablePolicies()) {
    it(`holds for ${policy.name}`, () => {
      const result = simulate(EXAMPLE, CONFIGURATION, policy, fixedRandomPicker);
      for (const metrics of result.perProcess) {
        const duration = EXAMPLE[metrics.id - 1].duration;
        expect(metrics.waitingTime).toBe(metrics.turnaroundTime - duration);
      }
    });
  }
});

describe('context switches', () => {
  it('counts every change of CPU occupant', () => {
    const result = simulate(
      EXAMPLE,
      CONFIGURATION,
      new FirstComeFirstServePolicy(),
      fixedRandomPicker,
    );
    // P2 -> P1 -> P3 -> P4.
    expect(result.contextSwitches).toBe(3);
  });

  it('does not count an idle CPU as a switch', () => {
    // P1 finishes at t=2 and P2 is only created at t=5: three idle seconds
    // between them, and a single context switch.
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 2, priority: 1 },
      { creationTime: 5, duration: 2, priority: 1 },
    ];
    const result = simulate(input, CONFIGURATION, new FirstComeFirstServePolicy(), fixedRandomPicker);

    expect(result.timeline.map((slice) => slice.running)).toEqual([1, 1, null, null, null, 2, 2]);
    expect(result.contextSwitches).toBe(1);
  });

  it('counts no switch when a single process holds the CPU the whole time', () => {
    const result = simulate(
      [{ creationTime: 0, duration: 5, priority: 1 }],
      CONFIGURATION,
      new FirstComeFirstServePolicy(),
      fixedRandomPicker,
    );
    expect(result.contextSwitches).toBe(0);
  });
});
