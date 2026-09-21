import type { Config, Processo } from './tipos';

/**
 * Contexto entregue à política a cada segundo de simulação.
 */
export interface ContextoEscolha {
  /** Processos criados e ainda não finalizados, candidatos à CPU. */
  readonly prontos: readonly Processo[];
  /** Quem estava com a CPU no segundo anterior, ou `null` se ociosa. */
  readonly emExecucao: Processo | null;
  /** Segundos consecutivos que `emExecucao` já acumulou na fatia atual. */
  readonly quantumConsumido: number;
  readonly instante: number;
  readonly config: Config;
}

/**
 * Uma estratégia de escalonamento.
 *
 * Padrão Strategy: o laço de simulação é escrito uma única vez e cada um dos
 * sete algoritmos do enunciado entra aqui como uma implementação diferente.
 * Assim a contagem de trocas de contexto, o registro da linha do tempo e a
 * regra de desempate não são reescritos sete vezes.
 */
export interface PoliticaEscalonamento {
  readonly nome: string;

  /**
   * Ordena os candidatos do mais para o menos apto a ocupar a CPU.
   *
   * A política **não** decide sozinha: o laço aplica a regra de desempate do
   * enunciado sobre os empatados no topo. Por isso a política expõe uma ordem
   * e um critério de empate, em vez de simplesmente retornar um processo.
   */
  ordenar(contexto: ContextoEscolha): readonly Processo[];

  /**
   * Indica se dois processos empatam pelo critério desta política.
   *
   * O laço usa isso para descobrir a faixa de empatados no topo da ordenação
   * e então desempatar conforme o enunciado.
   */
  empatam(a: Processo, b: Processo, contexto: ContextoEscolha): boolean;

  /**
   * Se `true`, um processo em execução pode perder a CPU antes de terminar.
   * Algoritmos não preemptivos seguram a CPU até o processo finalizar.
   */
  readonly preemptiva: boolean;

  /**
   * Ajuste de estado no fim de cada quantum. Só o algoritmo com envelhecimento
   * usa; os demais herdam o comportamento vazio.
   */
  aoFimDoQuantum?(contexto: ContextoEscolha, escolhido: Processo): void;

  /**
   * Se `true`, a CPU é reavaliada a cada `quantum` segundos mesmo sem o
   * processo ter terminado. É o que caracteriza os algoritmos round-robin.
   */
  readonly usaQuantum: boolean;
}
