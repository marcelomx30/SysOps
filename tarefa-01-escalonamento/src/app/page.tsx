/**
 * Placeholder da interface web.
 *
 * A interface completa é a issue #14 (frente B). Esta página existe para que o
 * build do Next funcione enquanto isso, e já demonstra o motor rodando.
 */
import { politicasDisponiveis, simular, type Config, type EntradaProcesso } from '@/engine';

const EXEMPLO: EntradaProcesso[] = [
  { criacao: 0, duracao: 5, prioridade: 2 },
  { criacao: 0, duracao: 2, prioridade: 3 },
  { criacao: 1, duracao: 4, prioridade: 1 },
  { criacao: 3, duracao: 3, prioridade: 4 },
];

const CONFIG: Config = { quantum: 2, aging: 1 };

export default function Home() {
  const resultados = politicasDisponiveis().map((politica) =>
    simular(EXEMPLO, CONFIG, politica),
  );

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '48rem' }}>
      <h1>Simulador de Escalonamento de Processos</h1>
      <p>
        Interface completa em construção (issue #14). Abaixo, o motor rodando sobre o
        exemplo do enunciado.
      </p>
      {resultados.map((resultado) => (
        <section key={resultado.algoritmo}>
          <h2>{resultado.algoritmo}</h2>
          <ul>
            <li>Tempo médio de vida (tt): {resultado.turnaroundMedio.toFixed(2)}</li>
            <li>Tempo médio de espera (tw): {resultado.esperaMedia.toFixed(2)}</li>
            <li>Trocas de contexto: {resultado.trocasDeContexto}</li>
          </ul>
        </section>
      ))}
    </main>
  );
}
