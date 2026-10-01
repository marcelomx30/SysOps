/**
 * Exporta a linha do tempo real do motor para o Manim consumir.
 *
 * É este arquivo que garante que o vídeo mostre os algoritmos implementados,
 * e não uma animação decorativa: a cena do Manim não recalcula nada, ela só
 * desenha o JSON que sai daqui. Se o motor mudar, basta reexportar.
 *
 * As chaves do JSON ficam em português porque é a língua da narração do
 * vídeo; o motor é consumido pela sua API em inglês.
 *
 * Uso: npm run video:dados
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { availablePolicies, simulate, type ProcessInput } from '../src/engine';

/** Mesma entrada do enunciado, para o vídeo casar com o exemplo da aula. */
const INPUT: ProcessInput[] = [
  { creationTime: 0, duration: 5, priority: 2 },
  { creationTime: 0, duration: 2, priority: 3 },
  { creationTime: 1, duration: 4, priority: 1 },
  { creationTime: 3, duration: 3, priority: 4 },
];

const CONFIGURATION = { quantum: 2, aging: 1 };

const cenas = availablePolicies().map((policy) => {
  const result = simulate(INPUT, CONFIGURATION, policy);
  return {
    algoritmo: result.algorithm,
    // Uma entrada por segundo: quem executou e quem esperou.
    linhaDoTempo: result.timeline.map((slice) => ({
      instante: slice.instant,
      executando: slice.running,
      prontos: [...slice.ready],
    })),
    porProcesso: result.perProcess.map((m) => ({
      id: m.id,
      turnaround: m.turnaroundTime,
      espera: m.waitingTime,
      resposta: m.responseTime,
    })),
    turnaroundMedio: result.averageTurnaroundTime,
    esperaMedia: result.averageWaitingTime,
    trocasDeContexto: result.contextSwitches,
  };
});

const saida = {
  processos: INPUT.map((p, i) => ({
    id: i + 1,
    criacao: p.creationTime,
    duracao: p.duration,
    prioridade: p.priority,
  })),
  config: CONFIGURATION,
  cenas,
};

const destino = join(import.meta.dirname, 'dados.json');
writeFileSync(destino, JSON.stringify(saida, null, 2));
console.log(`${cenas.length} cena(s) exportada(s) para ${destino}`);
for (const c of cenas) {
  console.log(`  ${c.algoritmo}: ${c.linhaDoTempo.length}s, ${c.trocasDeContexto} trocas`);
}
