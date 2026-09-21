/** Ponto de entrada público do motor, consumido pelo CLI e pela interface web. */
export { lerConfig, lerProcessos } from './parser';
export { simular } from './simulador';
export type { Sorteio } from './simulador';
export type { PoliticaEscalonamento } from './politica';
export * from './tipos';

import { PoliticaFcfs } from './policies/fcfs';
import { PoliticaSjf } from './policies/sjf';
import { PoliticaSrtf } from './policies/srtf';
import type { PoliticaEscalonamento } from './politica';

/**
 * Políticas disponíveis, na ordem em que o enunciado as lista.
 *
 * As frentes B e C registram aqui os quatro algoritmos restantes (prioridade
 * com e sem preempção, e os dois round-robin) conforme forem implementados.
 */
export function politicasDisponiveis(): PoliticaEscalonamento[] {
  return [new PoliticaFcfs(), new PoliticaSjf(), new PoliticaSrtf()];
}
