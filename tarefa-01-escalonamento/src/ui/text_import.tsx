'use client';

import { useState } from 'react';
import { rowsFromText, type ProcessRow } from './input_model';

interface TextImportProps {
  readonly onImport: (rows: readonly ProcessRow[]) => void;
}

/** Lets the user paste the CLI's stdin format (one "criação duração prioridade" per line). */
export function TextImport({ onImport }: TextImportProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    try {
      onImport(rowsFromText(text));
      setText('');
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };

  return (
    <details className="text-import">
      <summary>Colar entrada em texto</summary>
      <p className="hint">Uma linha por processo: instante de criação, duração e prioridade.</p>
      <textarea
        rows={5}
        spellCheck={false}
        aria-label="Entrada em texto no formato do stdin"
        placeholder={'0 5 2\n0 2 3\n1 4 1'}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {error && <p role="alert" className="error">{error}</p>}
      <button type="button" className="secondary" onClick={load}>
        Carregar texto
      </button>
    </details>
  );
}
