import { describe, expect, it } from 'vitest';
import { parseConfiguration, parseProcesses } from '../parser';

describe('parseProcesses', () => {
  it('reads the assignment example', () => {
    expect(parseProcesses('0 5 2\n0 2 3\n1 4 1\n3 3 4')).toEqual([
      { creationTime: 0, duration: 5, priority: 2 },
      { creationTime: 0, duration: 2, priority: 3 },
      { creationTime: 1, duration: 4, priority: 1 },
      { creationTime: 3, duration: 3, priority: 4 },
    ]);
  });

  it('accepts multiple spaces and tabs between fields', () => {
    expect(parseProcesses('0    5\t\t2')).toEqual([{ creationTime: 0, duration: 5, priority: 2 }]);
  });

  it('ignores empty lines and surrounding whitespace', () => {
    expect(parseProcesses('\n  0 5 2  \n\n  1 4 1\n\n')).toHaveLength(2);
  });

  it('preserves the original order, even with out-of-order creation', () => {
    // The input order is what numbers P1, P2... in the diagram; do not reorder.
    const processes = parseProcesses('5 1 1\n0 1 1');
    expect(processes.map((process) => process.creationTime)).toEqual([5, 0]);
  });

  it('rejects a line with the wrong number of fields', () => {
    expect(() => parseProcesses('0 5')).toThrow(/3 inteiros/);
    expect(() => parseProcesses('0 5 2 7')).toThrow(/4 campo/);
  });

  it('rejects non-integer values', () => {
    expect(() => parseProcesses('0 5.5 2')).toThrow(/"5.5"/);
    expect(() => parseProcesses('a 5 2')).toThrow(/"a"/);
  });

  it('rejects duration and priority outside the valid range', () => {
    expect(() => parseProcesses('0 0 2')).toThrow(/Duração inválida/);
    expect(() => parseProcesses('0 5 0')).toThrow(/Prioridade inválida/);
    expect(() => parseProcesses('-1 5 2')).toThrow(/negativo/);
  });
});

describe('parseConfiguration', () => {
  it('reads the assignment format', () => {
    expect(parseConfiguration('quantum:2\naging:1')).toEqual({ quantum: 2, aging: 1 });
  });

  it('tolerates spaces around the key and the value', () => {
    expect(parseConfiguration('  quantum : 4 \n aging: 3 ')).toEqual({ quantum: 4, aging: 3 });
  });

  it('uses the defaults when a key is missing', () => {
    expect(parseConfiguration('quantum:5')).toEqual({ quantum: 5, aging: 1 });
    expect(parseConfiguration('')).toEqual({ quantum: 2, aging: 1 });
  });

  it('ignores comments and unknown keys', () => {
    expect(parseConfiguration('# comentário\nfoo:9\nquantum:3')).toEqual({ quantum: 3, aging: 1 });
  });

  it('rejects invalid values', () => {
    expect(() => parseConfiguration('quantum:0')).toThrow(/Quantum inválido/);
    expect(() => parseConfiguration('aging:-1')).toThrow(/Aging inválido/);
    expect(() => parseConfiguration('quantum 2')).toThrow(/sem ":"/);
  });
});
