import type { Configuration, ProcessInput } from './types';

const DEFAULT_CONFIGURATION: Configuration = { quantum: 2, aging: 1 };

function parseIntegerOrThrow(text: string, field: string, line: string): number {
  // Number() would silently accept "1.5" and " "; the assignment requires integers.
  if (!/^-?\d+$/.test(text)) {
    throw new Error(
      `Valor inválido para ${field}: "${text}" na linha "${line}". ` +
        `Esperado: um número inteiro.`,
    );
  }
  return Number.parseInt(text, 10);
}

/**
 * Reads the processes from standard input.
 *
 * Each line has three integers — creation instant, duration and priority —
 * separated by one or more whitespace characters. Empty lines are ignored. The
 * listing does not need to be sorted by creation time; the original order is
 * preserved because it is what numbers the processes (P1, P2, ...) in the diagram.
 *
 * @example
 * parseProcesses('0 5 2\n1 4 1');
 * // [{ creationTime: 0, duration: 5, priority: 2 }, { creationTime: 1, duration: 4, priority: 1 }]
 */
export function parseProcesses(text: string): ProcessInput[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line) => {
    const fields = line.split(/\s+/);
    if (fields.length !== 3) {
      throw new Error(
        `Linha com ${fields.length} campo(s): "${line}". ` +
          `Esperado: 3 inteiros (criação, duração, prioridade) separados por espaços.`,
      );
    }

    const creationTime = parseIntegerOrThrow(fields[0], 'instante de criação', line);
    const duration = parseIntegerOrThrow(fields[1], 'duração', line);
    const priority = parseIntegerOrThrow(fields[2], 'prioridade', line);

    if (creationTime < 0) {
      throw new Error(
        `Instante de criação negativo: ${creationTime} na linha "${line}". Esperado: >= 0.`,
      );
    }
    if (duration <= 0) {
      throw new Error(
        `Duração inválida: ${duration} na linha "${line}". Esperado: inteiro > 0.`,
      );
    }
    if (priority <= 0) {
      throw new Error(
        `Prioridade inválida: ${priority} na linha "${line}". ` +
          `Esperado: inteiro > 0 (escala de prioridades positiva).`,
      );
    }

    return { creationTime, duration, priority };
  });
}

/**
 * Reads the plain text configuration file, in the `key:value` format.
 *
 * Missing keys fall back to the default (quantum 2, aging 1), which is the
 * assignment's example. Unknown keys are ignored.
 *
 * @example
 * parseConfiguration('quantum:4\naging:2'); // { quantum: 4, aging: 2 }
 */
export function parseConfiguration(text: string): Configuration {
  const values = new Map<string, number>();

  for (const line of text.split('\n')) {
    const cleanLine = line.trim();
    if (cleanLine.length === 0 || cleanLine.startsWith('#')) continue;

    const separatorIndex = cleanLine.indexOf(':');
    if (separatorIndex === -1) {
      throw new Error(
        `Linha de configuração sem ":": "${cleanLine}". Esperado: formato chave:valor.`,
      );
    }

    const key = cleanLine.slice(0, separatorIndex).trim().toLowerCase();
    const rawValue = cleanLine.slice(separatorIndex + 1).trim();
    if (key !== 'quantum' && key !== 'aging') continue;

    values.set(key, parseIntegerOrThrow(rawValue, key, cleanLine));
  }

  const quantum = values.get('quantum') ?? DEFAULT_CONFIGURATION.quantum;
  const aging = values.get('aging') ?? DEFAULT_CONFIGURATION.aging;

  if (quantum <= 0) {
    throw new Error(`Quantum inválido: ${quantum}. Esperado: inteiro > 0.`);
  }
  if (aging < 0) {
    throw new Error(`Aging inválido: ${aging}. Esperado: inteiro >= 0.`);
  }

  return { quantum, aging };
}
