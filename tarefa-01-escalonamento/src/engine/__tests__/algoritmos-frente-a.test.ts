import { describe, expect, it } from 'vitest';
import { PoliticaFcfs } from '../policies/fcfs';
import { PoliticaSjf } from '../policies/sjf';
import { PoliticaSrtf } from '../policies/srtf';
import { simular } from '../simulador';
import type { Config, EntradaProcesso, ResultadoSimulacao } from '../tipos';

/** Exemplo do enunciado: P1(0,5,2) P2(0,2,3) P3(1,4,1) P4(3,3,4). */
const EXEMPLO: EntradaProcesso[] = [
  { criacao: 0, duracao: 5, prioridade: 2 },
  { criacao: 0, duracao: 2, prioridade: 3 },
  { criacao: 1, duracao: 4, prioridade: 1 },
  { criacao: 3, duracao: 3, prioridade: 4 },
];

const CONFIG: Config = { quantum: 2, aging: 1 };

/** Sorteio fixo: mantém os testes determinísticos se a regra (iii) for atingida. */
const sorteioFixo = () => 0;

/** Sequência de ocupação da CPU, um id por segundo — legível no teste. */
function ocupacao(resultado: ResultadoSimulacao): (number | null)[] {
  return resultado.linhaDoTempo.map((fatia) => fatia.executando);
}

describe('FCFS', () => {
  const resultado = simular(EXEMPLO, CONFIG, new PoliticaFcfs(), sorteioFixo);

  it('executa na ordem de chegada, sem preempção', () => {
    // P1 e P2 chegam juntos em t=0; o desempate por menor restante dá a CPU a P2.
    expect(ocupacao(resultado)).toEqual([2, 2, 1, 1, 1, 1, 1, 3, 3, 3, 3, 4, 4, 4]);
  });

  it('produz as métricas calculadas à mão para o exemplo do enunciado', () => {
    expect(resultado.turnaroundMedio).toBe(7.5);
    expect(resultado.esperaMedia).toBe(4);
    expect(resultado.trocasDeContexto).toBe(3);
  });

  it('não interrompe um processo em andamento quando outro chega', () => {
    // P3 chega em t=1, durante a execução de P2, e não toma a CPU.
    expect(resultado.linhaDoTempo[1].executando).toBe(2);
  });
});

describe('SJF', () => {
  const resultado = simular(EXEMPLO, CONFIG, new PoliticaSjf(), sorteioFixo);

  it('escolhe sempre o de menor duração total entre os prontos', () => {
    expect(ocupacao(resultado)).toEqual([2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 1, 1, 1, 1]);
  });

  it('produz as métricas calculadas à mão para o exemplo do enunciado', () => {
    expect(resultado.turnaroundMedio).toBe(6.75);
    expect(resultado.esperaMedia).toBe(3.25);
    expect(resultado.trocasDeContexto).toBe(3);
  });

  it('usa a duração total, não o tempo restante', () => {
    // Um processo longo já em execução não é preterido por um curto que chega.
    const entrada: EntradaProcesso[] = [
      { criacao: 0, duracao: 6, prioridade: 1 },
      { criacao: 1, duracao: 2, prioridade: 1 },
    ];
    const r = simular(entrada, CONFIG, new PoliticaSjf(), sorteioFixo);
    expect(ocupacao(r)).toEqual([1, 1, 1, 1, 1, 1, 2, 2]);
  });
});

describe('SRTF', () => {
  const resultado = simular(EXEMPLO, CONFIG, new PoliticaSrtf(), sorteioFixo);

  it('produz as métricas calculadas à mão para o exemplo do enunciado', () => {
    expect(resultado.turnaroundMedio).toBe(6.75);
    expect(resultado.esperaMedia).toBe(3.25);
    expect(resultado.trocasDeContexto).toBe(3);
  });

  it('preempta o processo atual quando chega um com tempo restante menor', () => {
    const entrada: EntradaProcesso[] = [
      { criacao: 0, duracao: 6, prioridade: 1 },
      { criacao: 1, duracao: 2, prioridade: 1 },
    ];
    const r = simular(entrada, CONFIG, new PoliticaSrtf(), sorteioFixo);
    // P2 chega em t=1 com restante 2 < 5 de P1, toma a CPU e só devolve ao fim.
    expect(ocupacao(r)).toEqual([1, 2, 2, 1, 1, 1, 1, 1]);
    expect(r.trocasDeContexto).toBe(2);
  });

  it('mantém o processo atual em caso de empate, evitando troca de contexto', () => {
    // Em t=3, P3 e P4 empatam com restante 3; P3 está na CPU e permanece.
    expect(resultado.linhaDoTempo[3].executando).toBe(3);
  });
});

describe('regra de desempate', () => {
  it('escolhe o de menor tempo restante quando ninguém está na CPU', () => {
    const entrada: EntradaProcesso[] = [
      { criacao: 0, duracao: 5, prioridade: 1 },
      { criacao: 0, duracao: 2, prioridade: 1 },
    ];
    // Empatam na chegada; vence o de menor restante (P2), não o de menor id.
    const r = simular(entrada, CONFIG, new PoliticaFcfs(), sorteioFixo);
    expect(r.linhaDoTempo[0].executando).toBe(2);
  });

  it('cai no sorteio apenas quando chegada e restante empatam', () => {
    const entrada: EntradaProcesso[] = [
      { criacao: 0, duracao: 3, prioridade: 1 },
      { criacao: 0, duracao: 3, prioridade: 1 },
    ];
    const r = simular(entrada, CONFIG, new PoliticaFcfs(), () => 1);
    expect(r.linhaDoTempo[0].executando).toBe(2);
  });
});

describe('linha do tempo', () => {
  it('registra os prontos que aguardam, base do diagrama de tempo', () => {
    const r = simular(EXEMPLO, CONFIG, new PoliticaFcfs(), sorteioFixo);
    // Em t=0, P2 executa e P1 aguarda; P3 e P4 ainda não foram criados.
    expect(r.linhaDoTempo[0]).toEqual({ instante: 0, executando: 2, prontos: [1] });
  });

  it('cobre um segundo por fatia, do instante 0 até o último término', () => {
    const r = simular(EXEMPLO, CONFIG, new PoliticaFcfs(), sorteioFixo);
    expect(r.linhaDoTempo).toHaveLength(14);
    expect(r.linhaDoTempo.map((f) => f.instante)).toEqual([...Array(14).keys()]);
  });

  it('marca CPU ociosa quando nenhum processo foi criado ainda', () => {
    const r = simular([{ criacao: 2, duracao: 1, prioridade: 1 }], CONFIG, new PoliticaFcfs(), sorteioFixo);
    expect(ocupacao(r)).toEqual([null, null, 1]);
  });
});
