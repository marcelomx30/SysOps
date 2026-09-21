/**
 * Contrato compartilhado entre o motor de simulação, o CLI e a interface web.
 *
 * Este arquivo é o ponto de acoplamento das três frentes de trabalho: qualquer
 * mudança aqui afeta todo mundo e deve ser combinada com o grupo antes.
 */

/**
 * Estado de um processo ao longo da simulação.
 *
 * `nao-criado` cobre o intervalo antes do instante de criação — é o que produz
 * as células vazias à esquerda no diagrama de tempo do enunciado.
 */
export type StatusProcesso = 'nao-criado' | 'pronto' | 'executando' | 'finalizado';

/**
 * Um processo e seu estado de controle durante a simulação.
 *
 * O enunciado pede explicitamente uma estrutura que mapeie informações de
 * controle (id, status, prioridade) — é esta, e ela está descrita no documento
 * de decisões de implementação.
 */
export interface Processo {
  /** Identificador sequencial atribuído na leitura: 1 vira "P1" no diagrama. */
  readonly id: number;
  /** Instante de criação, em segundos, lido da entrada. */
  readonly criacao: number;
  /** Duração total de CPU exigida, em segundos. Não muda durante a simulação. */
  readonly duracao: number;
  /** Prioridade estática lida da entrada. Menor número = maior prioridade. */
  readonly prioridadeEstatica: number;

  /** Prioridade corrente. Só difere da estática no algoritmo com envelhecimento. */
  prioridadeDinamica: number;
  /** Segundos de CPU ainda necessários. Decrementa a cada segundo executado. */
  restante: number;
  status: StatusProcesso;

  /** Instante em que recebeu a CPU pela primeira vez; `null` enquanto não executou. */
  primeiraExecucao: number | null;
  /** Instante em que terminou; `null` enquanto não terminou. */
  termino: number | null;
}

/** Parâmetros lidos do arquivo de configuração em texto plano. */
export interface Config {
  /** Fatia de tempo dos algoritmos round-robin, em segundos. */
  readonly quantum: number;
  /** Incremento de prioridade por quantum no algoritmo com envelhecimento. */
  readonly aging: number;
}

/**
 * O que aconteceu em um segundo de simulação — a unidade do diagrama de tempo.
 *
 * Um registro por segundo decorrido. Esta é a única fonte de dados tanto para o
 * diagrama textual do CLI quanto para a animação da interface web, o que garante
 * que as duas saídas nunca divirjam.
 */
export interface FatiaDeTempo {
  /** Início da fatia. A fatia cobre o intervalo [instante, instante + 1). */
  readonly instante: number;
  /** Processo que ocupou a CPU, ou `null` se a CPU ficou ociosa. */
  readonly executando: number | null;
  /** Processos criados e não finalizados que aguardavam a CPU nesta fatia. */
  readonly prontos: readonly number[];
}

/** Métricas de um processo individual, derivadas ao fim da simulação. */
export interface MetricasProcesso {
  readonly id: number;
  /** Tempo de vida (turnaround): término − criação. */
  readonly turnaround: number;
  /** Tempo de espera: turnaround − duração. Quanto ficou pronto sem executar. */
  readonly espera: number;
  /** Tempo de resposta: primeira execução − criação. */
  readonly resposta: number;
}

/** Resultado completo de uma execução de um algoritmo sobre uma entrada. */
export interface ResultadoSimulacao {
  readonly algoritmo: string;
  /** Linha do tempo segundo a segundo, na ordem cronológica. */
  readonly linhaDoTempo: readonly FatiaDeTempo[];
  readonly porProcesso: readonly MetricasProcesso[];
  /** Tempo médio de vida (tt), exigido na saída. */
  readonly turnaroundMedio: number;
  /** Tempo médio de espera (tw), exigido na saída. */
  readonly esperaMedia: number;
  /** Trocas de contexto, exigidas na saída. */
  readonly trocasDeContexto: number;
}

/** Dados de um processo como vêm da entrada, antes de virar `Processo`. */
export interface EntradaProcesso {
  readonly criacao: number;
  readonly duracao: number;
  readonly prioridade: number;
}
