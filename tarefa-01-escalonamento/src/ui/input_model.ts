import {
  availablePolicies,
  parseConfiguration,
  parseProcesses,
  simulate,
  type ProcessInput,
  type SimulationResult,
} from '@/engine';

/**
 * One editable line of the process table. Fields stay as strings, exactly as
 * typed: validation is the engine parser's job, so the web interface enforces
 * the same rules (and shows the same messages) as the CLI.
 */
export interface ProcessRow {
  /** Stable React key; unrelated to the process number, which is the row position. */
  readonly key: number;
  readonly creationTime: string;
  readonly duration: string;
  readonly priority: string;
}

export interface FormValues {
  readonly rows: readonly ProcessRow[];
  readonly quantum: string;
  readonly aging: string;
}

export type Evaluation =
  | { readonly ok: true; readonly processCount: number; readonly results: readonly SimulationResult[] }
  | { readonly ok: false; readonly error: string };

/** The assignment's example, in the same format the CLI reads from stdin. */
export const EXAMPLE_INPUT = '0 5 2\n0 2 3\n1 4 1\n3 3 4';
export const EXAMPLE_QUANTUM = '2';
export const EXAMPLE_AGING = '1';

/** Names of the algorithms the engine offers, in the assignment's order. */
export function algorithmNames(): string[] {
  return availablePolicies().map((policy) => policy.name);
}

/** Reads stdin-format text into editable rows. Throws the parser's message if malformed. */
export function rowsFromText(text: string): ProcessRow[] {
  return parseProcesses(text).map(toRow);
}

function toRow(input: ProcessInput, index: number): ProcessRow {
  return {
    key: index + 1,
    creationTime: String(input.creationTime),
    duration: String(input.duration),
    priority: String(input.priority),
  };
}

/** Inverse of `rowsFromText`: the rows as stdin-format text. */
export function rowsToText(rows: readonly ProcessRow[]): string {
  return rows.map(rowToLine).join('\n');
}

function rowToLine(row: ProcessRow): string {
  return `${row.creationTime} ${row.duration} ${row.priority}`.trim();
}

export function nextRowKey(rows: readonly ProcessRow[]): number {
  return rows.reduce((highest, row) => Math.max(highest, row.key), 0) + 1;
}

/**
 * Validates the form and runs every algorithm over it.
 *
 * All algorithms run in one pass on purpose: the tie-break rule is random, so
 * simulating the selected algorithm and the comparison table separately could
 * show two different results for the same input.
 */
export function evaluate(values: FormValues): Evaluation {
  try {
    if (values.rows.length === 0) {
      return { ok: false, error: 'Adicione ao menos um processo.' };
    }
    const inputs = values.rows.flatMap(parseRow);
    const configuration = parseConfiguration(
      `quantum:${values.quantum.trim()}\naging:${values.aging.trim()}`,
    );
    const results = availablePolicies().map((policy) => simulate(inputs, configuration, policy));
    return { ok: true, processCount: inputs.length, results };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Parses one row, prefixing errors with the process the user has to fix. */
function parseRow(row: ProcessRow, index: number): ProcessInput[] {
  const label = `P${index + 1}`;
  const fields = [row.creationTime, row.duration, row.priority];
  if (fields.some((field) => field.trim() === '')) {
    throw new Error(`${label}: preencha instante de criação, duração e prioridade.`);
  }
  return parseWithLabel(rowToLine(row), label);
}

function parseWithLabel(line: string, label: string): ProcessInput[] {
  try {
    return parseProcesses(line);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label}: ${message}`);
  }
}
