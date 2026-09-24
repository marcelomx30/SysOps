'use client';

import { useEffect, useId, useState } from 'react';
import { ComparisonTable } from './comparison_table';
import {
  EXAMPLE_AGING,
  EXAMPLE_INPUT,
  EXAMPLE_QUANTUM,
  algorithmNames,
  evaluate,
  rowsFromText,
  type Evaluation,
  type FormValues,
  type ProcessRow,
} from './input_model';
import { MetricsPanel } from './metrics_panel';
import { ProcessEditor } from './process_editor';
import { TextImport } from './text_import';
import { TimeDiagram } from './time_diagram';

type Success = Extract<Evaluation, { ok: true }>;

const ALGORITHMS = algorithmNames();

const EXAMPLE: FormValues = {
  rows: rowsFromText(EXAMPLE_INPUT),
  quantum: EXAMPLE_QUANTUM,
  aging: EXAMPLE_AGING,
};

/**
 * The simulator screen. It holds the form state and hands it to the engine;
 * there is no scheduling logic here.
 *
 * The first simulation runs after mount, not during render: the engine breaks
 * some ties at random, so a server-rendered result would not match the client's
 * and React would report a hydration mismatch.
 */
export function Simulator() {
  const [values, setValues] = useState<FormValues>(EXAMPLE);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [lastValid, setLastValid] = useState<Success | null>(null);
  const [selected, setSelected] = useState(0);
  const selectId = useId();

  const commit = (next: FormValues) => {
    const outcome = evaluate(next);
    setValues(next);
    setEvaluation(outcome);
    // Keep showing the last good result while a field is mid-edit and invalid.
    if (outcome.ok) setLastValid(outcome);
  };

  useEffect(() => commit(EXAMPLE), []);

  const setRows = (rows: readonly ProcessRow[]) => commit({ ...values, rows });
  const result = lastValid?.results[selected];

  return (
    <main className="page">
      <header>
        <h1>Simulador de Escalonamento de Processos</h1>
        <p className="hint">
          Edite os processos e os parâmetros; o resultado é recalculado a cada alteração.
        </p>
      </header>

      <section aria-labelledby="inputs-title">
        <h2 id="inputs-title">Entrada</h2>
        <ProcessEditor rows={values.rows} onChange={setRows} />
        <div className="params">
          <ParameterField label="Quantum (s)" value={values.quantum}
            onChange={(quantum) => commit({ ...values, quantum })} />
          <ParameterField label="Aging" value={values.aging}
            onChange={(aging) => commit({ ...values, aging })} />
        </div>
        <p className="hint">Quantum e aging só afetam os algoritmos Round-Robin.</p>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => commit(EXAMPLE)}>
            Carregar exemplo do enunciado
          </button>
          <button type="button" className="secondary" onClick={() => commit(values)}>
            Simular novamente
          </button>
        </div>
        <TextImport onImport={setRows} />
        {evaluation && !evaluation.ok && (
          <p role="alert" className="error">{evaluation.error}</p>
        )}
      </section>

      {lastValid && result && (
        <div className={evaluation && !evaluation.ok ? 'results stale' : 'results'}>
          <section aria-labelledby="algorithm-title">
            <h2 id="algorithm-title">Algoritmo</h2>
            <label htmlFor={selectId} className="visually-hidden">Algoritmo</label>
            <select id={selectId} value={selected}
              onChange={(event) => setSelected(Number(event.target.value))}>
              {ALGORITHMS.map((name, index) => (
                <option key={name} value={index}>{name}</option>
              ))}
            </select>
          </section>

          <section aria-labelledby="metrics-title">
            <h2 id="metrics-title">Métricas</h2>
            <MetricsPanel result={result} />
          </section>

          <section aria-labelledby="diagram-title">
            <h2 id="diagram-title">Diagrama de tempo</h2>
            <TimeDiagram timeline={result.timeline} processCount={lastValid.processCount} />
          </section>

          <section aria-labelledby="comparison-title">
            <h2 id="comparison-title">Comparação</h2>
            <ComparisonTable results={lastValid.results} selected={selected} onSelect={setSelected} />
          </section>
        </div>
      )}
    </main>
  );
}

interface ParameterFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

function ParameterField({ label, value, onChange }: ParameterFieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" inputMode="numeric" autoComplete="off" value={value}
        onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
