import type {
  FatiaDeTempo,
  MetricasProcesso,
  Processo,
  ResultadoSimulacao,
} from './tipos';

function media(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

/**
 * Deriva as métricas exigidas pelo enunciado ao fim de uma simulação.
 *
 * Os tempos saem dos instantes registrados nos próprios processos durante o
 * laço, e não de uma recontagem da linha do tempo, para que as sete políticas
 * usem exatamente o mesmo cálculo.
 */
export function calcularMetricas(
  algoritmo: string,
  processos: readonly Processo[],
  linhaDoTempo: readonly FatiaDeTempo[],
  trocasDeContexto: number,
): ResultadoSimulacao {
  const porProcesso: MetricasProcesso[] = processos.map((processo) => {
    if (processo.termino === null || processo.primeiraExecucao === null) {
      throw new Error(
        `Processo P${processo.id} não finalizou: termino=${processo.termino}, ` +
          `primeiraExecucao=${processo.primeiraExecucao}. ` +
          `Esperado: ambos preenchidos ao fim da simulação.`,
      );
    }
    const turnaround = processo.termino - processo.criacao;
    return {
      id: processo.id,
      turnaround,
      espera: turnaround - processo.duracao,
      resposta: processo.primeiraExecucao - processo.criacao,
    };
  });

  return {
    algoritmo,
    linhaDoTempo,
    porProcesso,
    turnaroundMedio: media(porProcesso.map((m) => m.turnaround)),
    esperaMedia: media(porProcesso.map((m) => m.espera)),
    trocasDeContexto,
  };
}
