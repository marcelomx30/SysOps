import type { Config, EntradaProcesso } from './tipos';

const CONFIG_PADRAO: Config = { quantum: 2, aging: 1 };

function inteiroOuErro(texto: string, campo: string, linha: string): number {
  // Number() aceitaria "1.5" e " " silenciosamente; o enunciado exige inteiros.
  if (!/^-?\d+$/.test(texto)) {
    throw new Error(
      `Valor inválido para ${campo}: "${texto}" na linha "${linha}". ` +
        `Esperado: um número inteiro.`,
    );
  }
  return Number.parseInt(texto, 10);
}

/**
 * Lê os processos da entrada padrão.
 *
 * Cada linha traz três inteiros — instante de criação, duração e prioridade —
 * separados por um ou mais espaços em branco. Linhas vazias são ignoradas. A
 * listagem não precisa vir ordenada por data de criação; a ordem original é
 * preservada porque é ela que numera os processos (P1, P2, ...) no diagrama.
 *
 * @example
 * lerProcessos('0 5 2\n1 4 1');
 * // [{ criacao: 0, duracao: 5, prioridade: 2 }, { criacao: 1, duracao: 4, prioridade: 1 }]
 */
export function lerProcessos(texto: string): EntradaProcesso[] {
  const linhas = texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);

  return linhas.map((linha) => {
    const campos = linha.split(/\s+/);
    if (campos.length !== 3) {
      throw new Error(
        `Linha com ${campos.length} campo(s): "${linha}". ` +
          `Esperado: 3 inteiros (criação, duração, prioridade) separados por espaços.`,
      );
    }

    const criacao = inteiroOuErro(campos[0], 'instante de criação', linha);
    const duracao = inteiroOuErro(campos[1], 'duração', linha);
    const prioridade = inteiroOuErro(campos[2], 'prioridade', linha);

    if (criacao < 0) {
      throw new Error(
        `Instante de criação negativo: ${criacao} na linha "${linha}". Esperado: >= 0.`,
      );
    }
    if (duracao <= 0) {
      throw new Error(
        `Duração inválida: ${duracao} na linha "${linha}". Esperado: inteiro > 0.`,
      );
    }
    if (prioridade <= 0) {
      throw new Error(
        `Prioridade inválida: ${prioridade} na linha "${linha}". ` +
          `Esperado: inteiro > 0 (escala de prioridades positiva).`,
      );
    }

    return { criacao, duracao, prioridade };
  });
}

/**
 * Lê o arquivo de configuração em texto plano, no formato `chave:valor`.
 *
 * Chaves ausentes caem no padrão (quantum 2, aging 1), que é o exemplo do
 * enunciado. Chaves desconhecidas são ignoradas.
 *
 * @example
 * lerConfig('quantum:4\naging:2'); // { quantum: 4, aging: 2 }
 */
export function lerConfig(texto: string): Config {
  const valores = new Map<string, number>();

  for (const linha of texto.split('\n')) {
    const limpa = linha.trim();
    if (limpa.length === 0 || limpa.startsWith('#')) continue;

    const separador = limpa.indexOf(':');
    if (separador === -1) {
      throw new Error(
        `Linha de configuração sem ":": "${limpa}". Esperado: formato chave:valor.`,
      );
    }

    const chave = limpa.slice(0, separador).trim().toLowerCase();
    const bruto = limpa.slice(separador + 1).trim();
    if (chave !== 'quantum' && chave !== 'aging') continue;

    valores.set(chave, inteiroOuErro(bruto, chave, limpa));
  }

  const quantum = valores.get('quantum') ?? CONFIG_PADRAO.quantum;
  const aging = valores.get('aging') ?? CONFIG_PADRAO.aging;

  if (quantum <= 0) {
    throw new Error(`Quantum inválido: ${quantum}. Esperado: inteiro > 0.`);
  }
  if (aging < 0) {
    throw new Error(`Aging inválido: ${aging}. Esperado: inteiro >= 0.`);
  }

  return { quantum, aging };
}
