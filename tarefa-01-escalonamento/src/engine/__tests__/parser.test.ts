import { describe, expect, it } from 'vitest';
import { lerConfig, lerProcessos } from '../parser';

describe('lerProcessos', () => {
  it('lê o exemplo do enunciado', () => {
    expect(lerProcessos('0 5 2\n0 2 3\n1 4 1\n3 3 4')).toEqual([
      { criacao: 0, duracao: 5, prioridade: 2 },
      { criacao: 0, duracao: 2, prioridade: 3 },
      { criacao: 1, duracao: 4, prioridade: 1 },
      { criacao: 3, duracao: 3, prioridade: 4 },
    ]);
  });

  it('aceita múltiplos espaços e tabulações entre os campos', () => {
    expect(lerProcessos('0    5\t\t2')).toEqual([{ criacao: 0, duracao: 5, prioridade: 2 }]);
  });

  it('ignora linhas vazias e espaços nas bordas', () => {
    expect(lerProcessos('\n  0 5 2  \n\n  1 4 1\n\n')).toHaveLength(2);
  });

  it('preserva a ordem original, mesmo com criação fora de ordem', () => {
    // A ordem da entrada é o que numera P1, P2... no diagrama; não reordenar.
    const processos = lerProcessos('5 1 1\n0 1 1');
    expect(processos.map((p) => p.criacao)).toEqual([5, 0]);
  });

  it('rejeita linha com número errado de campos', () => {
    expect(() => lerProcessos('0 5')).toThrow(/3 inteiros/);
    expect(() => lerProcessos('0 5 2 7')).toThrow(/4 campo/);
  });

  it('rejeita valores não inteiros', () => {
    expect(() => lerProcessos('0 5.5 2')).toThrow(/"5.5"/);
    expect(() => lerProcessos('a 5 2')).toThrow(/"a"/);
  });

  it('rejeita duração e prioridade fora da faixa válida', () => {
    expect(() => lerProcessos('0 0 2')).toThrow(/Duração inválida/);
    expect(() => lerProcessos('0 5 0')).toThrow(/Prioridade inválida/);
    expect(() => lerProcessos('-1 5 2')).toThrow(/negativo/);
  });
});

describe('lerConfig', () => {
  it('lê o formato do enunciado', () => {
    expect(lerConfig('quantum:2\naging:1')).toEqual({ quantum: 2, aging: 1 });
  });

  it('tolera espaços ao redor da chave e do valor', () => {
    expect(lerConfig('  quantum : 4 \n aging: 3 ')).toEqual({ quantum: 4, aging: 3 });
  });

  it('usa os padrões quando uma chave falta', () => {
    expect(lerConfig('quantum:5')).toEqual({ quantum: 5, aging: 1 });
    expect(lerConfig('')).toEqual({ quantum: 2, aging: 1 });
  });

  it('ignora comentários e chaves desconhecidas', () => {
    expect(lerConfig('# comentário\nfoo:9\nquantum:3')).toEqual({ quantum: 3, aging: 1 });
  });

  it('rejeita valores inválidos', () => {
    expect(() => lerConfig('quantum:0')).toThrow(/Quantum inválido/);
    expect(() => lerConfig('aging:-1')).toThrow(/Aging inválido/);
    expect(() => lerConfig('quantum 2')).toThrow(/sem ":"/);
  });
});
