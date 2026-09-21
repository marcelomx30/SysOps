import type { ContextoEscolha, PoliticaEscalonamento } from './politica';
import { calcularMetricas } from './metricas';
import type {
  Config,
  EntradaProcesso,
  FatiaDeTempo,
  Processo,
  ResultadoSimulacao,
} from './tipos';

/** Fonte de aleatoriedade injetável, para que os testes sejam determinísticos. */
export type Sorteio = (quantidade: number) => number;

const sorteioPadrao: Sorteio = (quantidade) => Math.floor(Math.random() * quantidade);

/** Teto de segurança: impede laço infinito caso uma política nunca finalize. */
const LIMITE_DE_INSTANTES = 100_000;

/** Converte a entrada crua em processos com estado de controle inicializado. */
function criarProcessos(entrada: readonly EntradaProcesso[]): Processo[] {
  return entrada.map((dados, indice) => ({
    id: indice + 1,
    criacao: dados.criacao,
    duracao: dados.duracao,
    prioridadeEstatica: dados.prioridade,
    prioridadeDinamica: dados.prioridade,
    restante: dados.duracao,
    status: 'nao-criado' as const,
    primeiraExecucao: null,
    termino: null,
  }));
}

/**
 * Aplica a regra de desempate do enunciado sobre os candidatos empatados no topo.
 *
 * Ordem exigida: (i) o processo que já está com o processador, para evitar troca
 * de contexto; (ii) o de menor tempo restante; (iii) escolha aleatória.
 */
function desempatar(
  empatados: readonly Processo[],
  emExecucao: Processo | null,
  sortear: Sorteio,
): Processo {
  if (empatados.length === 1) return empatados[0];

  // (i) mantém quem já está na CPU
  const atual = empatados.find((p) => emExecucao !== null && p.id === emExecucao.id);
  if (atual !== undefined) return atual;

  // (ii) menor tempo restante
  const menorRestante = Math.min(...empatados.map((p) => p.restante));
  const comMenorRestante = empatados.filter((p) => p.restante === menorRestante);
  if (comMenorRestante.length === 1) return comMenorRestante[0];

  // (iii) escolha aleatória entre os que continuam empatados
  return comMenorRestante[sortear(comMenorRestante.length)];
}

/** Seleciona o processo que ocupará a CPU neste segundo. */
function escolher(
  politica: PoliticaEscalonamento,
  contexto: ContextoEscolha,
  sortear: Sorteio,
): Processo {
  const ordenados = politica.ordenar(contexto);
  const lider = ordenados[0];
  const empatados = ordenados.filter((p) => politica.empatam(p, lider, contexto));
  return desempatar(empatados, contexto.emExecucao, sortear);
}

/**
 * Decide se o processo que está na CPU a mantém neste segundo.
 *
 * Um processo só é reavaliado quando a política é preemptiva ou quando esgotou
 * seu quantum. Fora desses casos ele segue até terminar, que é justamente o que
 * define os algoritmos colaborativos (não preemptivos).
 */
function mantemCpu(
  politica: PoliticaEscalonamento,
  emExecucao: Processo | null,
  quantumConsumido: number,
  config: Config,
): boolean {
  if (emExecucao === null || emExecucao.restante === 0) return false;
  if (politica.usaQuantum && quantumConsumido >= config.quantum) return false;
  return !politica.preemptiva;
}

/**
 * Executa a simulação de um conjunto de processos sob uma política.
 *
 * O tempo avança em passos discretos de 1 segundo, como pede o diagrama do
 * enunciado. A cada passo: admite os processos que chegaram, escolhe quem ocupa
 * a CPU, executa por 1 segundo e registra a fatia na linha do tempo.
 *
 * @example
 * const resultado = simular(
 *   [{ criacao: 0, duracao: 5, prioridade: 2 }],
 *   { quantum: 2, aging: 1 },
 *   new PoliticaFcfs(),
 * );
 * console.log(resultado.turnaroundMedio); // 5
 */
export function simular(
  entrada: readonly EntradaProcesso[],
  config: Config,
  politica: PoliticaEscalonamento,
  sortear: Sorteio = sorteioPadrao,
): ResultadoSimulacao {
  const processos = criarProcessos(entrada);
  const linhaDoTempo: FatiaDeTempo[] = [];

  let instante = 0;
  let emExecucao: Processo | null = null;
  // Último processo a ocupar a CPU, inclusive já finalizado. Diferente de
  // `emExecucao`, que é zerado no término: sem isso, a troca que sucede um
  // processo finalizado deixaria de ser contada.
  let ultimoOcupante: Processo | null = null;
  let quantumConsumido = 0;
  let trocasDeContexto = 0;

  while (processos.some((p) => p.status !== 'finalizado')) {
    if (instante > LIMITE_DE_INSTANTES) {
      throw new Error(
        `Simulação de "${politica.nome}" excedeu ${LIMITE_DE_INSTANTES} instantes — ` +
          `provável laço infinito na política.`,
      );
    }

    // Admite quem chegou neste instante.
    for (const processo of processos) {
      if (processo.status === 'nao-criado' && processo.criacao <= instante) {
        processo.status = 'pronto';
      }
    }

    const prontos = processos.filter((p) => p.status === 'pronto' || p.status === 'executando');

    if (prontos.length === 0) {
      // CPU ociosa: nenhum processo criado ainda. Avança sem registrar troca.
      linhaDoTempo.push({ instante, executando: null, prontos: [] });
      emExecucao = null;
      quantumConsumido = 0;
      instante += 1;
      continue;
    }

    const contexto: ContextoEscolha = {
      prontos,
      emExecucao,
      quantumConsumido,
      instante,
      config,
    };

    const escolhido: Processo =
      emExecucao !== null && mantemCpu(politica, emExecucao, quantumConsumido, config)
        ? emExecucao
        : escolher(politica, contexto, sortear);

    // Troca de contexto só conta quando o ocupante da CPU muda de fato.
    if (ultimoOcupante !== null && ultimoOcupante.id !== escolhido.id) {
      trocasDeContexto += 1;
    }
    if (emExecucao !== null && emExecucao.id !== escolhido.id) {
      emExecucao.status = 'pronto';
    }

    quantumConsumido = emExecucao !== null && emExecucao.id === escolhido.id ? quantumConsumido : 0;

    if (escolhido.primeiraExecucao === null) escolhido.primeiraExecucao = instante;
    escolhido.status = 'executando';

    linhaDoTempo.push({
      instante,
      executando: escolhido.id,
      prontos: prontos.filter((p) => p.id !== escolhido.id).map((p) => p.id),
    });

    escolhido.restante -= 1;
    quantumConsumido += 1;
    ultimoOcupante = escolhido;
    instante += 1;

    if (politica.usaQuantum && quantumConsumido >= config.quantum) {
      politica.aoFimDoQuantum?.(contexto, escolhido);
    }

    if (escolhido.restante === 0) {
      escolhido.status = 'finalizado';
      escolhido.termino = instante;
      emExecucao = null;
      quantumConsumido = 0;
    } else {
      emExecucao = escolhido;
    }
  }

  return calcularMetricas(politica.nome, processos, linhaDoTempo, trocasDeContexto);
}
