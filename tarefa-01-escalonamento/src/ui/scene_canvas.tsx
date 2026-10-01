'use client';

import { useEffect, useRef } from 'react';
import type { SimulationResult } from '@/engine';
import { paintFrame } from './scene_painter';
import { BEFORE_START, clampInstant, type PlaybackState } from './playback_contract';

interface AnimatedStageProps {
  readonly result: SimulationResult;
  readonly processCount: number;
  /**
   * Playhead position, produced by the playback engine.
   *
   * Optional so the stage renders before playback is wired in: without it the
   * whole run is shown, which is the right still image for a finished result.
   */
  readonly playback?: PlaybackState;
}

/**
 * The simulation drawn as an animated stage, in the style of the Manim video.
 *
 * Unlike the rendered clip — a fixed recording of the assignment's example —
 * this is painted from the live `timeline`, so it follows whatever input the
 * user types, across all seven algorithms.
 *
 * Canvas rather than DOM nodes: a long run with many processes is hundreds of
 * cells, and repainting them on every frame of playback is far cheaper than
 * asking React to diff that many elements.
 */
export function AnimatedStage({ result, processCount, playback }: AnimatedStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeline = result.timeline;

  const currentInstant =
    playback === undefined
      ? timeline.length - 1
      : clampInstant(playback.currentInstant, timeline.length);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext('2d');
    if (context === null) return;

    // Repaint on resize too: the stage is fluid, and a canvas keeps its old
    // bitmap when the element resizes, which would show a stretched frame.
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintFrame(context, { timeline, processCount, currentInstant }, rect.width, rect.height);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [timeline, processCount, currentInstant]);

  const running =
    currentInstant >= 0 ? (timeline[currentInstant]?.running ?? null) : null;

  return (
    <div className="stage">
      <canvas
        ref={canvasRef}
        className="stage-canvas"
        role="img"
        aria-label={
          currentInstant < BEFORE_START + 1
            ? 'Simulação não iniciada'
            : `Instante ${currentInstant}: ${running === null ? 'CPU ociosa' : `P${running} no processador`}`
        }
      />
    </div>
  );
}
