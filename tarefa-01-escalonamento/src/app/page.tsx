/**
 * Placeholder for the web interface.
 *
 * The complete interface is issue #14 (workstream B). This page exists so that
 * the Next build works in the meantime, and it already shows the engine running.
 */
import { availablePolicies, simulate, type Configuration, type ProcessInput } from '@/engine';

const EXAMPLE: ProcessInput[] = [
  { creationTime: 0, duration: 5, priority: 2 },
  { creationTime: 0, duration: 2, priority: 3 },
  { creationTime: 1, duration: 4, priority: 1 },
  { creationTime: 3, duration: 3, priority: 4 },
];

const CONFIGURATION: Configuration = { quantum: 2, aging: 1 };

export default function Home() {
  const results = availablePolicies().map((policy) =>
    simulate(EXAMPLE, CONFIGURATION, policy),
  );

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '48rem' }}>
      <h1>Simulador de Escalonamento de Processos</h1>
      <p>
        Interface completa em construção (issue #14). Abaixo, o motor rodando sobre o
        exemplo do enunciado.
      </p>
      {results.map((result) => (
        <section key={result.algorithm}>
          <h2>{result.algorithm}</h2>
          <ul>
            <li>Tempo médio de vida (tt): {result.averageTurnaroundTime.toFixed(2)}</li>
            <li>Tempo médio de espera (tw): {result.averageWaitingTime.toFixed(2)}</li>
            <li>Trocas de contexto: {result.contextSwitches}</li>
          </ul>
        </section>
      ))}
    </main>
  );
}
