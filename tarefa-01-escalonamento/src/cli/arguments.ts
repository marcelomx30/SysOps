/** Simulator parameters already resolved from the command line. */
export interface Arguments {
  /** Path of the configuration file, or `null` to use the defaults. */
  readonly configurationPath: string | null;
  readonly help: boolean;
}

export const USAGE = `Simulador de escalonamento de processos.

Uso:
  npm run cli -- [--config <arquivo>] < <entrada>

Os processos vêm da entrada padrão, um por linha, com três inteiros separados
por espaços: instante de criação, duração em segundos e prioridade estática.

Opções:
  --config <arquivo>  Arquivo de configuração com quantum e aging.
                      Sem ele, valem os padrões quantum:2 e aging:1.
  -h, --help          Mostra esta ajuda.`;

/**
 * Parses the command line arguments.
 *
 * Lives in a module of its own, with no import side effects, so that tests can
 * exercise it without triggering `main.ts`'s read of standard input.
 */
export function parseArguments(argv: readonly string[]): Arguments {
  let configurationPath: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '-h' || argument === '--help') {
      return { configurationPath: null, help: true };
    }

    if (argument === '--config') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('-')) {
        throw new Error('--config exige o caminho de um arquivo.');
      }
      configurationPath = value;
      index += 1;
      continue;
    }

    throw new Error(`Argumento desconhecido: "${argument}". Use --help para ver as opções.`);
  }

  return { configurationPath, help: false };
}
