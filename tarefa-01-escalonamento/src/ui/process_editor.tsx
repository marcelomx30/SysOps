'use client';

import { nextRowKey, type ProcessRow } from './input_model';

type Field = 'creationTime' | 'duration' | 'priority';

const COLUMNS: readonly { field: Field; label: string }[] = [
  { field: 'creationTime', label: 'Criação (s)' },
  { field: 'duration', label: 'Duração (s)' },
  { field: 'priority', label: 'Prioridade' },
];

interface ProcessEditorProps {
  readonly rows: readonly ProcessRow[];
  readonly onChange: (rows: readonly ProcessRow[]) => void;
}

/** Table to add, remove and edit processes. Row order defines P1, P2, ... */
export function ProcessEditor({ rows, onChange }: ProcessEditorProps) {
  const edit = (key: number, field: Field, value: string) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  const remove = (key: number) => onChange(rows.filter((row) => row.key !== key));

  const add = () =>
    onChange([...rows, { key: nextRowKey(rows), creationTime: '0', duration: '1', priority: '1' }]);

  return (
    <div>
      <table className="editor">
        <thead>
          <tr>
            <th scope="col">Proc.</th>
            {COLUMNS.map(({ field, label }) => (
              <th key={field} scope="col">{label}</th>
            ))}
            <th scope="col"><span className="visually-hidden">Remover</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key}>
              <th scope="row">P{index + 1}</th>
              {COLUMNS.map(({ field, label }) => (
                <td key={field}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`${label} de P${index + 1}`}
                    value={row[field]}
                    onChange={(event) => edit(row.key, field, event.target.value)}
                  />
                </td>
              ))}
              <td>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remover P${index + 1}`}
                  onClick={() => remove(row.key)}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="secondary" onClick={add}>
        + Adicionar processo
      </button>
    </div>
  );
}
