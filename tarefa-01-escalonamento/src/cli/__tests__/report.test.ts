import { describe, expect, it } from 'vitest';
import { availablePolicies, type Configuration, type ProcessInput } from '../../engine';
import { parseArguments } from '../arguments';
import { formatReport } from '../report';

const EXAMPLE: ProcessInput[] = [
  { creationTime: 0, duration: 5, priority: 2 },
  { creationTime: 0, duration: 2, priority: 3 },
  { creationTime: 1, duration: 4, priority: 1 },
  { creationTime: 3, duration: 3, priority: 4 },
];

const CONFIGURATION: Configuration = { quantum: 2, aging: 1 };

describe('report', () => {
  const output = formatReport(EXAMPLE, CONFIGURATION);

  it('covers every algorithm registered in the engine', () => {
    for (const policy of availablePolicies()) {
      expect(output).toContain(`=== ${policy.name} ===`);
    }
  });

  it('carries the four required pieces of information for each algorithm', () => {
    const count = availablePolicies().length;
    for (const label of [
      'tempo médio de vida (tt)',
      'tempo médio de espera (tw)',
      'trocas de contexto',
      'tempo  P1 P2 P3 P4',
    ]) {
      expect(output.split(label)).toHaveLength(count + 1);
    }
  });

  it('reacts to the quantum from the configuration file', () => {
    const withQuantumFour = formatReport(EXAMPLE, { quantum: 4, aging: 1 });
    expect(withQuantumFour).not.toBe(output);
  });
});

describe('command line arguments', () => {
  it('reads the configuration file path', () => {
    expect(parseArguments(['--config', 'exemplos/config.txt'])).toEqual({
      configurationPath: 'exemplos/config.txt',
      help: false,
    });
  });

  it('accepts the absence of --config', () => {
    expect(parseArguments([])).toEqual({ configurationPath: null, help: false });
  });

  it('complains about --config without a value', () => {
    expect(() => parseArguments(['--config'])).toThrow(/exige o caminho/);
    expect(() => parseArguments(['--config', '--help'])).toThrow(/exige o caminho/);
  });

  it('complains about an unknown argument', () => {
    expect(() => parseArguments(['--quantum', '4'])).toThrow(/desconhecido/);
  });
});
