import type { ContextoEscolha, PoliticaEscalonamento } from '../politica';
import type { Processo } from '../tipos';

/**
 * Shortest Job First: escolhe o processo de menor duração total, sem preempção.
 *
 * Usa a duração **total** e não o tempo restante — é o que o diferencia do SRTF.
 * Como não há preempção, a distinção só aparece na chegada de novos processos:
 * um trabalho curto que chega no meio espera o atual terminar.
 */
export class PoliticaSjf implements PoliticaEscalonamento {
  readonly nome = 'SJF (Shortest Job First)';
  readonly preemptiva = false;
  readonly usaQuantum = false;

  ordenar(contexto: ContextoEscolha): readonly Processo[] {
    return [...contexto.prontos].sort((a, b) => a.duracao - b.duracao);
  }

  empatam(a: Processo, b: Processo): boolean {
    return a.duracao === b.duracao;
  }
}
