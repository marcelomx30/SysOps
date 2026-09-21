import type { ContextoEscolha, PoliticaEscalonamento } from '../politica';
import type { Processo } from '../tipos';

/**
 * Shortest Remaining Time First: versão preemptiva do SJF.
 *
 * A cada segundo reavalia quem tem o menor tempo **restante**, de modo que a
 * chegada de um processo mais curto que o restante do atual toma a CPU. Empate
 * mantém o processo corrente pela regra de desempate do simulador, evitando
 * troca de contexto desnecessária.
 */
export class PoliticaSrtf implements PoliticaEscalonamento {
  readonly nome = 'SRTF (Shortest Remaining Time First)';
  readonly preemptiva = true;
  readonly usaQuantum = false;

  ordenar(contexto: ContextoEscolha): readonly Processo[] {
    return [...contexto.prontos].sort((a, b) => a.restante - b.restante);
  }

  empatam(a: Processo, b: Processo): boolean {
    return a.restante === b.restante;
  }
}
