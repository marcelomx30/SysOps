import { describe, expect, it } from 'vitest';
import type { SchedulingPolicy, SelectionContext } from '../scheduling_policy';
import { simulate } from '../simulator';
import type { Configuration, Process, ProcessInput } from '../types';

const CONFIGURATION: Configuration = { quantum: 2, aging: 1 };
const fixedRandomPicker = () => 0;

/**
 * Minimal quantum policy, used to observe the loop without depending on any
 * real algorithm: serves in order of arrival and writes down what the
 * simulator tells it about the current time slice.
 */
class ProbePolicy implements SchedulingPolicy {
  readonly name = 'probe';
  readonly preemptive = false;
  readonly usesQuantum = true;

  /** Instants at which `onSliceEnd` was called, in order. */
  readonly sliceBoundaries: number[] = [];
  /** Value of `quantumUsed` at every CPU reevaluation. */
  readonly sliceAtReevaluation: number[] = [];

  sort(context: SelectionContext): readonly Process[] {
    this.sliceAtReevaluation.push(context.quantumUsed);
    return [...context.ready].sort((first, second) => first.creationTime - second.creationTime);
  }

  areTied(first: Process, second: Process): boolean {
    return first.creationTime === second.creationTime;
  }

  onSliceEnd(context: SelectionContext): void {
    this.sliceBoundaries.push(context.instant);
  }
}

describe('quantum slice', () => {
  it('announces the end of the slice only at boundaries, even with a single ready process', () => {
    const policy = new ProbePolicy();
    const input: ProcessInput[] = [{ creationTime: 0, duration: 5, priority: 1 }];

    simulate(input, CONFIGURATION, policy, fixedRandomPicker);

    // With quantum 2, the quanta end at the end of t=1 and of t=3. The process
    // finishes at t=4, which cuts the third slice short and ends it there.
    expect(policy.sliceBoundaries).toEqual([1, 3, 4]);
  });

  it('restarts the slice when the same process wins the reevaluation', () => {
    const policy = new ProbePolicy();
    // Single process: every reevaluation hands the CPU back to itself. If the
    // slice did not restart in that case, `quantumUsed` would grow without
    // bound and the CPU would end up being reevaluated every second.
    const input: ProcessInput[] = [{ creationTime: 0, duration: 8, priority: 1 }];

    simulate(input, CONFIGURATION, policy, fixedRandomPicker);

    expect(policy.sliceBoundaries).toEqual([1, 3, 5, 7]);
    // One reevaluation at t=0 (idle CPU) and one at each boundary: never above
    // the quantum, and never one per second.
    expect(policy.sliceAtReevaluation).toEqual([0, 2, 2, 2]);
  });
});
