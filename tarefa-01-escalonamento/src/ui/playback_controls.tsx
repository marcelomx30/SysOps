'use client';

import { BEFORE_START, SPEEDS } from './playback_contract';
import type { PlaybackModel } from './playback_model';

interface PlaybackControlsProps {
  readonly playback: PlaybackModel;
  readonly timelineLength: number;
}

export function PlaybackControls({ playback, timelineLength }: PlaybackControlsProps) {
  const last = Math.max(BEFORE_START, timelineLength - 1);
  return (
    <div className="playback-controls" role="group" aria-label="Controles de reprodução">
      <button type="button" onClick={playback.toggle} disabled={timelineLength === 0}
        aria-label={playback.isPlaying ? 'Pausar simulação' : 'Reproduzir simulação'}
        aria-pressed={playback.isPlaying}>{playback.isPlaying ? 'Pausar' : 'Reproduzir'}</button>
      <PlaybackSeek playback={playback} timelineLength={timelineLength} />
      <span className="playback-time">t = {playback.currentInstant}/{last}</span>
      <PlaybackSpeeds playback={playback} />
    </div>
  );
}

function PlaybackSeek({ playback, timelineLength }: PlaybackControlsProps) {
  return (
    <div className="playback-seek">
      <button type="button" aria-label="Voltar um instante" disabled={playback.currentInstant <= BEFORE_START}
        onClick={() => playback.seek(playback.currentInstant - 1)}>←</button>
      <input type="range" min={BEFORE_START} max={Math.max(0, timelineLength - 1)} step={1}
        value={playback.currentInstant} disabled={timelineLength === 0} aria-label="Instante da simulação"
        aria-valuetext={playback.currentInstant === BEFORE_START ? 'Antes do início' : `Instante ${playback.currentInstant}`}
        onChange={(event) => playback.seek(Number(event.target.value))} />
      <button type="button" aria-label="Avançar um instante" disabled={playback.currentInstant >= timelineLength - 1}
        onClick={() => playback.seek(playback.currentInstant + 1)}>→</button>
    </div>
  );
}

function PlaybackSpeeds({ playback }: Pick<PlaybackControlsProps, 'playback'>) {
  return (
    <div className="playback-speeds" role="group" aria-label="Velocidade de reprodução">
      {SPEEDS.map((speed) => (
        <button key={speed} type="button" aria-pressed={playback.speed === speed}
          onClick={() => playback.setSpeed(speed)}>{speed}×</button>
      ))}
    </div>
  );
}
