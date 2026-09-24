import type { SimulationResult } from '@/engine';

const DECIMALS = 2;

/** The three figures the assignment requires, plus the per-process breakdown. */
export function MetricsPanel({ result }: { readonly result: SimulationResult }) {
  return (
    <div>
      <dl className="metric-cards">
        <Metric label="Tempo médio de vida (tt)" value={result.averageTurnaroundTime.toFixed(DECIMALS)} />
        <Metric label="Tempo médio de espera (tw)" value={result.averageWaitingTime.toFixed(DECIMALS)} />
        <Metric label="Trocas de contexto" value={String(result.contextSwitches)} />
      </dl>
      <div className="scroll-x">
        <table className="data">
          <caption>Por processo</caption>
          <thead>
            <tr>
              <th scope="col">Proc.</th>
              <th scope="col">Vida</th>
              <th scope="col">Espera</th>
              <th scope="col">Resposta</th>
            </tr>
          </thead>
          <tbody>
            {result.perProcess.map((metrics) => (
              <tr key={metrics.id}>
                <th scope="row">P{metrics.id}</th>
                <td>{metrics.turnaroundTime}</td>
                <td>{metrics.waitingTime}</td>
                <td>{metrics.responseTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="metric-card">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
