import { describe, expect, it } from 'vitest';
import { availablePolicies, simulate, type Configuration, type ProcessInput } from '../../engine';
import { FirstComeFirstServePolicy } from '../../engine/policies/first_come_first_serve';
import { formatDiagram } from '../diagram';

/** Assignment example: P1(0,5,2) P2(0,2,3) P3(1,4,1) P4(3,3,4). */
const EXAMPLE: ProcessInput[] = [
  { creationTime: 0, duration: 5, priority: 2 },
  { creationTime: 0, duration: 2, priority: 3 },
  { creationTime: 1, duration: 4, priority: 1 },
  { creationTime: 3, duration: 3, priority: 4 },
];

const CONFIGURATION: Configuration = { quantum: 2, aging: 1 };
const fixedRandomPicker = () => 0;

describe('time diagram', () => {
  it('reproduces the assignment format for the example under FCFS', () => {
    const result = simulate(
      EXAMPLE,
      CONFIGURATION,
      new FirstComeFirstServePolicy(),
      fixedRandomPicker,
    );

    // Blank on the left while the process has not been created (P3 at t=0, P4
    // until t=2) and on the right once it has finished (P2 from t=2 on).
    expect(formatDiagram(result.timeline, EXAMPLE.length)).toBe(
      [
        'tempo  P1 P2 P3 P4',
        ' 0- 1  -- ##',
        ' 1- 2  -- ## --',
        ' 2- 3  ##    --',
        ' 3- 4  ##    -- --',
        ' 4- 5  ##    -- --',
        ' 5- 6  ##    -- --',
        ' 6- 7  ##    -- --',
        ' 7- 8        ## --',
        ' 8- 9        ## --',
        ' 9-10        ## --',
        '10-11        ## --',
        '11-12           ##',
        '12-13           ##',
        '13-14           ##',
      ].join('\n'),
    );
  });

  it('leaves the line blank while the CPU is idle', () => {
    const result = simulate(
      [{ creationTime: 2, duration: 1, priority: 1 }],
      CONFIGURATION,
      new FirstComeFirstServePolicy(),
      fixedRandomPicker,
    );

    expect(formatDiagram(result.timeline, 1)).toBe(
      ['tempo  P1', ' 0- 1', ' 1- 2', ' 2- 3  ##'].join('\n'),
    );
  });

  it('keeps the columns aligned with ten or more processes', () => {
    // The assignment warns the simulator will be tested with other inputs.
    const input: ProcessInput[] = Array.from({ length: 12 }, () => ({
      creationTime: 0,
      duration: 1,
      priority: 1,
    }));
    const result = simulate(input, CONFIGURATION, new FirstComeFirstServePolicy(), fixedRandomPicker);
    const [header, ...lines] = formatDiagram(result.timeline, input.length).split('\n');

    expect(header).toContain('P10 P11 P12');
    // Each process runs for one second; its mark falls under its own label.
    lines.forEach((line, index) => {
      expect(line.indexOf('##')).toBe(header.indexOf(`P${index + 1}`));
    });
  });

  it('widens the time label once the simulation passes two digits', () => {
    const result = simulate(
      [{ creationTime: 0, duration: 100, priority: 1 }],
      CONFIGURATION,
      new FirstComeFirstServePolicy(),
      fixedRandomPicker,
    );
    const lines = formatDiagram(result.timeline, 1).split('\n');

    expect(lines[0]).toBe('tempo    P1');
    expect(lines[1]).toBe('  0-  1  ##');
    expect(lines[100]).toBe(' 99-100  ##');
  });

  it('leaves no trailing spaces at the end of the lines', () => {
    for (const policy of availablePolicies()) {
      const result = simulate(EXAMPLE, CONFIGURATION, policy, fixedRandomPicker);
      for (const line of formatDiagram(result.timeline, EXAMPLE.length).split('\n')) {
        expect(line).toBe(line.trimEnd());
      }
    }
  });
});
