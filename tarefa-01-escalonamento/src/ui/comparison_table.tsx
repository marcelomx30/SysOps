import type { SimulationResult } from '@/engine';

const DECIMALS = 2;

interface ComparisonTableProps {
  readonly results: readonly SimulationResult[];
  readonly selected: number;
  readonly onSelect: (index: number) => void;
}

/** All algorithms side by side over the same input; clicking one selects it. */
export function ComparisonTable({ results, selected, onSelect }: ComparisonTableProps) {
  return (
    <div className="scroll-x">
      <table className="data comparison">
        <thead>
          <tr>
            <th scope="col">Algoritmo</th>
            <th scope="col">tt</th>
            <th scope="col">tw</th>
            <th scope="col">Trocas</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={result.algorithm} className={index === selected ? 'selected' : undefined}>
              <th scope="row">
                <button
                  type="button"
                  className="link-button"
                  aria-pressed={index === selected}
                  onClick={() => onSelect(index)}
                >
                  {result.algorithm}
                </button>
              </th>
              <td>{result.averageTurnaroundTime.toFixed(DECIMALS)}</td>
              <td>{result.averageWaitingTime.toFixed(DECIMALS)}</td>
              <td>{result.contextSwitches}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
