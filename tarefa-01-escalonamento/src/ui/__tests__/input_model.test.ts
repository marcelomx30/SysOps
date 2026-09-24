import { describe, expect, it } from 'vitest';
import { availablePolicies } from '@/engine';
import {
  EXAMPLE_INPUT,
  algorithmNames,
  evaluate,
  nextRowKey,
  rowsFromText,
  rowsToText,
  type FormValues,
  type ProcessRow,
} from '../input_model';

const row = (key: number, creation: string, duration: string, priority: string): ProcessRow => ({
  key,
  creationTime: creation,
  duration,
  priority,
});

const VALID: FormValues = {
  rows: [row(1, '0', '5', '2'), row(2, '0', '2', '3'), row(3, '1', '4', '1'), row(4, '3', '3', '4')],
  quantum: '2',
  aging: '1',
};

describe('algorithmNames', () => {
  it('lists every algorithm registered in the engine, in order', () => {
    expect(algorithmNames()).toEqual(availablePolicies().map((policy) => policy.name));
  });
});

describe('rowsFromText / rowsToText', () => {
  it('turns stdin-format text into editable rows with unique keys', () => {
    const rows = rowsFromText('0 5 2\n1 4 1');
    expect(rows.map((r) => [r.creationTime, r.duration, r.priority])).toEqual([
      ['0', '5', '2'],
      ['1', '4', '1'],
    ]);
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
  });

  it('round-trips through the stdin format', () => {
    expect(rowsToText(rowsFromText('0 5 2\n1 4 1'))).toBe('0 5 2\n1 4 1');
  });

  it('rejects malformed text using the engine parser message', () => {
    expect(() => rowsFromText('0 5')).toThrow(/3 inteiros/);
  });

  it('exposes the assignment example as ready-to-load text', () => {
    expect(rowsFromText(EXAMPLE_INPUT)).toHaveLength(4);
  });
});

describe('nextRowKey', () => {
  it('is one above the highest key, and 1 for an empty list', () => {
    expect(nextRowKey([])).toBe(1);
    expect(nextRowKey([row(4, '0', '1', '1'), row(2, '0', '1', '1')])).toBe(5);
  });
});

describe('evaluate', () => {
  it('runs every algorithm over the same input', () => {
    const outcome = evaluate(VALID);
    if (!outcome.ok) throw new Error(outcome.error);
    expect(outcome.processCount).toBe(4);
    expect(outcome.results.map((r) => r.algorithm)).toEqual(algorithmNames());
  });

  it('reproduces the FCFS numbers of the assignment example', () => {
    const outcome = evaluate(VALID);
    if (!outcome.ok) throw new Error(outcome.error);
    expect(outcome.results[0].averageTurnaroundTime).toBeCloseTo(7.5);
    expect(outcome.results[0].averageWaitingTime).toBeCloseTo(4);
  });

  it('refuses an empty process list', () => {
    const outcome = evaluate({ ...VALID, rows: [] });
    expect(outcome).toEqual({ ok: false, error: expect.stringMatching(/ao menos um processo/i) });
  });

  it('names the offending process when a field is invalid', () => {
    const outcome = evaluate({ ...VALID, rows: [VALID.rows[0], row(2, '0', '0', '3')] });
    expect(outcome).toEqual({ ok: false, error: expect.stringMatching(/^P2: .*Duração inválida/) });
  });

  it('names the offending process when a field is left blank', () => {
    const outcome = evaluate({ ...VALID, rows: [row(1, '0', '', '2')] });
    expect(outcome).toEqual({ ok: false, error: expect.stringMatching(/^P1: preencha/i) });
  });

  it('rejects a blank row instead of silently skipping it', () => {
    const outcome = evaluate({ ...VALID, rows: [row(1, '', '', '')] });
    expect(outcome).toEqual({ ok: false, error: expect.stringMatching(/^P1: .*preencha/i) });
  });

  it('rejects an invalid quantum or aging with the engine message', () => {
    expect(evaluate({ ...VALID, quantum: '0' })).toEqual({
      ok: false,
      error: expect.stringMatching(/Quantum inválido/),
    });
    expect(evaluate({ ...VALID, aging: 'x' })).toEqual({
      ok: false,
      error: expect.stringMatching(/Valor inválido para aging/),
    });
  });
});
