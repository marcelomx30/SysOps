import type { TimeSlice } from '@/engine';
import { buildDiagramRows, type CellState } from './diagram_model';

const STATE_LABEL: Record<CellState, string> = {
  running: 'executando',
  ready: 'pronto, esperando a CPU',
  none: 'fora do sistema',
};

interface TimeDiagramProps {
  readonly timeline: readonly TimeSlice[];
  readonly processCount: number;
  readonly currentInstant?: number;
}

/**
 * Horizontal time diagram: one row per process, one column per second.
 * Scrolls sideways on narrow screens; the process labels stay pinned.
 */
export function TimeDiagram({ timeline, processCount, currentInstant }: TimeDiagramProps) {
  const rows = buildDiagramRows(timeline, processCount);

  return (
    <div>
      <ul className="legend" aria-label="Legenda">
        <li><span className="swatch running" /> Executando</li>
        <li><span className="swatch ready" /> Pronto</li>
        <li><span className="swatch none" /> Fora do sistema</li>
      </ul>
      <div className="scroll-x diagram-scroll">
        <table className="diagram">
          <thead>
            <tr>
              <th scope="col">t (s)</th>
              {timeline.map((slice) => (
                <th key={slice.instant} scope="col" className={playbackClass(slice.instant, currentInstant)}
                  aria-current={slice.instant === currentInstant ? 'time' : undefined}>{slice.instant}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.processId}>
                <th scope="row">P{row.processId}</th>
                {row.cells.map((state, instant) => (
                  <td key={instant} className={[state, playbackClass(instant, currentInstant)].filter(Boolean).join(' ')}>
                    <span className="visually-hidden">
                      {`de ${instant} a ${instant + 1} s: ${STATE_LABEL[state]}`}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function playbackClass(instant: number, currentInstant?: number): string | undefined {
  if (currentInstant === undefined) return undefined;
  if (instant > currentInstant) return 'playback-future';
  return instant === currentInstant ? 'playback-current' : undefined;
}
