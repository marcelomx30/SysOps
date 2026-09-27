import { describe, expect, it } from 'vitest';
import { FirstComeFirstServePolicy } from '../policies/first_come_first_serve';
import { NonPreemptivePriorityPolicy } from '../policies/non_preemptive_priority';
import { ShortestJobFirstPolicy } from '../policies/shortest_job_first';
import { ShortestRemainingTimeFirstPolicy } from '../policies/shortest_remaining_time_first';
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

describe('FCFS', () => {
  const result = simulate(EXAMPLE, CONFIGURATION, new FirstComeFirstServePolicy(), fixedRandomPicker);

  it('runs in order of arrival, without preemption', () => {
    // P1 and P2 arrive together at t=0 and are served in input order, as in
    // the assignment's time diagram.
    expect(cpuOccupancy(result)).toEqual([1, 1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4]);
  });

  it('produces the hand-calculated metrics for the assignment example', () => {
    // Completions: P1=5, P2=7, P3=11, P4=14.
    // tt: 5, 7, 10, 11 -> 33/4. tw = tt - duration: 0, 5, 6, 8 -> 19/4.
    expect(result.averageTurnaroundTime).toBe(8.25);
    expect(result.averageWaitingTime).toBe(4.75);
    expect(result.contextSwitches).toBe(3);
  });

  it('serves processes created at the same instant in input order, not by remaining time', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 5, priority: 1 },
      { creationTime: 0, duration: 2, priority: 1 },
    ];
    const simultaneous = simulate(input, CONFIGURATION, new FirstComeFirstServePolicy(), () => 1);
    expect(simultaneous.timeline[0].running).toBe(1);
  });

  it('does not interrupt a running process when another arrives', () => {
    // P3 arrives at t=1, during P1's execution, and does not take the CPU.
    expect(result.timeline[1].running).toBe(1);
  });
});

describe('SJF', () => {
  const result = simulate(EXAMPLE, CONFIGURATION, new ShortestJobFirstPolicy(), fixedRandomPicker);

  it('always chooses the one with the shortest total duration among the ready ones', () => {
    expect(cpuOccupancy(result)).toEqual([2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 1, 1, 1, 1]);
  });

  it('produces the hand-calculated metrics for the assignment example', () => {
    expect(result.averageTurnaroundTime).toBe(6.75);
    expect(result.averageWaitingTime).toBe(3.25);
    expect(result.contextSwitches).toBe(3);
  });

  it('uses the total duration, not the remaining time', () => {
    // A long process already running is not passed over by a short one that arrives.
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 6, priority: 1 },
      { creationTime: 1, duration: 2, priority: 1 },
    ];
    const shortJobResult = simulate(input, CONFIGURATION, new ShortestJobFirstPolicy(), fixedRandomPicker);
    expect(cpuOccupancy(shortJobResult)).toEqual([1, 1, 1, 1, 1, 1, 2, 2]);
  });
});

describe('SRTF', () => {
  const result = simulate(
    EXAMPLE,
    CONFIGURATION,
    new ShortestRemainingTimeFirstPolicy(),
    fixedRandomPicker,
  );

  it('produces the hand-calculated metrics for the assignment example', () => {
    expect(result.averageTurnaroundTime).toBe(6.75);
    expect(result.averageWaitingTime).toBe(3.25);
    expect(result.contextSwitches).toBe(3);
  });

  it('preempts the current process when one with a shorter remaining time arrives', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 6, priority: 1 },
      { creationTime: 1, duration: 2, priority: 1 },
    ];
    const preemptionResult = simulate(
      input,
      CONFIGURATION,
      new ShortestRemainingTimeFirstPolicy(),
      fixedRandomPicker,
    );
    // P2 arrives at t=1 with remaining 2 < 5 of P1, takes the CPU and only gives it back at the end.
    expect(cpuOccupancy(preemptionResult)).toEqual([1, 2, 2, 1, 1, 1, 1, 1]);
    expect(preemptionResult.contextSwitches).toBe(2);
  });

  it('keeps the current process on a tie, avoiding a context switch', () => {
    // At t=3, P3 and P4 tie with remaining 3; P3 is on the CPU and stays.
    expect(result.timeline[3].running).toBe(3);
  });
});

describe('tie-breaking rule', () => {
  it('chooses the one with the shortest remaining time when nobody is on the CPU', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 5, priority: 1 },
      { creationTime: 0, duration: 2, priority: 1 },
    ];
    // Equal priority ties them; the one with the shortest remaining (P2) wins, not the lowest id.
    const tieResult = simulate(input, CONFIGURATION, new NonPreemptivePriorityPolicy(), fixedRandomPicker);
    expect(tieResult.timeline[0].running).toBe(2);
  });

  it('falls back to the random pick only when the criterion and remaining time tie', () => {
    const input: ProcessInput[] = [
      { creationTime: 0, duration: 3, priority: 1 },
      { creationTime: 0, duration: 3, priority: 1 },
    ];
    const tieResult = simulate(input, CONFIGURATION, new ShortestJobFirstPolicy(), () => 1);
    expect(tieResult.timeline[0].running).toBe(2);
  });
});

describe('timeline', () => {
  it('records the waiting ready processes, basis of the time diagram', () => {
    const timelineResult = simulate(
      EXAMPLE,
      CONFIGURATION,
      new FirstComeFirstServePolicy(),
      fixedRandomPicker,
    );
    // At t=0, P1 runs and P2 waits; P3 and P4 have not been created yet.
    expect(timelineResult.timeline[0]).toEqual({ instant: 0, running: 1, ready: [2] });
  });

  it('covers one second per slice, from instant 0 until the last completion', () => {
    const timelineResult = simulate(
      EXAMPLE,
      CONFIGURATION,
      new FirstComeFirstServePolicy(),
      fixedRandomPicker,
    );
    expect(timelineResult.timeline).toHaveLength(14);
    expect(timelineResult.timeline.map((slice) => slice.instant)).toEqual([...Array(14).keys()]);
  });

  it('marks the CPU as idle when no process has been created yet', () => {
    const idleResult = simulate(
      [{ creationTime: 2, duration: 1, priority: 1 }],
      CONFIGURATION,
      new FirstComeFirstServePolicy(),
      fixedRandomPicker,
    );
    expect(cpuOccupancy(idleResult)).toEqual([null, null, 1]);
  });
});
