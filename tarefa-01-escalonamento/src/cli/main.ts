/**
 * Command line interface of the simulator.
 *
 * The assignment requires the program to read the processes from standard
 * input and write the results to standard output:
 *
 * ```
 * npm run cli -- --config exemplos/config.txt < exemplos/entrada-exemplo.txt
 * ```
 *
 * This file is only the I/O shell: read stdin, print, turn an error into an
 * exit code. Arguments live in `arguments.ts`, formatting in `report.ts` and
 * `diagram.ts`, and the simulation in the engine — the same one the web
 * interface uses. No scheduling is reimplemented here.
 *
 * Importing this module runs the simulator; whatever the tests need to
 * exercise lives in the other three.
 */
import { readFileSync } from 'node:fs';
import { parseConfiguration, parseProcesses, type Configuration } from '../engine';
import { parseArguments, USAGE } from './arguments';
import { formatReport } from './report';

function readStandardInput(): string {
  try {
    return readFileSync(0, 'utf-8');
  } catch {
    // Without redirection, reading descriptor 0 throws instead of returning empty.
    return '';
  }
}

function resolveConfiguration(path: string | null): Configuration {
  if (path === null) {
    process.stderr.write('Nenhum --config informado; usando os padrões quantum:2 e aging:1.\n');
    return parseConfiguration('');
  }
  return parseConfiguration(readFileSync(path, 'utf-8'));
}

function main(): void {
  const { configurationPath, help } = parseArguments(process.argv.slice(2));

  if (help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const text = readStandardInput();
  if (text.trim().length === 0) {
    throw new Error(
      'Entrada padrão vazia. Redirecione um arquivo de processos: ' +
        'npm run cli -- --config exemplos/config.txt < exemplos/entrada-exemplo.txt',
    );
  }

  const configuration = resolveConfiguration(configurationPath);
  process.stdout.write(formatReport(parseProcesses(text), configuration));
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
