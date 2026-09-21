import type { ContextoEscolha, PoliticaEscalonamento } from '../politica';
import type { Processo } from '../tipos';

/**
 * First Come, First Served: atende na ordem de chegada, sem preempção.
 *
 * O processo escolhido ocupa a CPU até terminar. É o algoritmo colaborativo
 * mais simples e serve de linha de base para comparar os demais: nenhum outro
 * critério além da ordem de chegada entra na decisão.
 */
export class PoliticaFcfs implements PoliticaEscalonamento {
  readonly nome = 'FCFS (First Come, First Served)';
  readonly preemptiva = false;
  readonly usaQuantum = false;

  ordenar(contexto: ContextoEscolha): readonly Processo[] {
    // Empate na chegada é resolvido pela regra do simulador, não pelo id.
    return [...contexto.prontos].sort((a, b) => a.criacao - b.criacao);
  }

  empatam(a: Processo, b: Processo): boolean {
    return a.criacao === b.criacao;
  }
}
