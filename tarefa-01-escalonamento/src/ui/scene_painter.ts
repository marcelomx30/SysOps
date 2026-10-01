import type { TimeSlice } from '@/engine';
import { buildDiagramRows, type CellState } from './diagram_model';
import { columnX, layoutStage, rowY, tickStep, type StageLayout } from './scene_layout';
import { processColor, STAGE } from './scene_palette';

/** Everything one frame needs. */
export interface Frame {
  readonly timeline: readonly TimeSlice[];
  readonly processCount: number;
  /** Last instant to reveal; `-1` draws the empty stage. */
  readonly currentInstant: number;
}

/** Hex color plus an alpha byte, e.g. `withAlpha('#58C4DD', 0.3)`. */
function withAlpha(hex: string, alpha: number): string {
  const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${hex}${byte.toString(16).padStart(2, '0')}`;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.roundRect(x, y, width, height, r);
}

/** Paints one cell: filled when running, hatched-dim when ready, bare otherwise. */
function paintCell(
  context: CanvasRenderingContext2D,
  layout: StageLayout,
  state: CellState,
  processId: number,
  instant: number,
  rowIndex: number,
  revealed: boolean,
): void {
  const x = columnX(layout, instant) + layout.cellGap / 2;
  const y = rowY(layout, rowIndex);
  const width = Math.max(1, layout.columnWidth - layout.cellGap);
  const color = processColor(processId);

  roundedRect(context, x, y, width, layout.rowHeight, 3);

  if (!revealed || state === 'none') {
    context.fillStyle = STAGE.emptyCell;
    context.fill();
    context.strokeStyle = STAGE.emptyBorder;
    context.lineWidth = 1;
    context.stroke();
    return;
  }

  if (state === 'running') {
    // The '##' of the assignment: this process holds the CPU.
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.stroke();
    return;
  }

  // The '--' of the assignment: ready, waiting its turn.
  context.fillStyle = withAlpha(color, 0.22);
  context.fill();
  context.strokeStyle = withAlpha(color, 0.4);
  context.lineWidth = 1;
  context.stroke();
}

function paintRuler(
  context: CanvasRenderingContext2D,
  layout: StageLayout,
  columns: number,
  currentInstant: number,
): void {
  const step = tickStep(layout);
  context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.textBaseline = 'top';
  context.textAlign = 'center';

  for (let instant = 0; instant <= columns; instant += step) {
    context.fillStyle = instant <= currentInstant ? STAGE.playhead : STAGE.muted;
    context.fillText(String(instant), columnX(layout, instant), 4);
  }
}

function paintLabels(
  context: CanvasRenderingContext2D,
  layout: StageLayout,
  processCount: number,
): void {
  context.font = 'bold 13px ui-serif, Georgia, serif';
  context.textBaseline = 'middle';
  context.textAlign = 'right';

  for (let index = 0; index < processCount; index += 1) {
    const processId = index + 1;
    context.fillStyle = processColor(processId);
    const y = rowY(layout, index) + layout.rowHeight / 2;
    context.fillText(`P${processId}`, columnX(layout, 0) - 8, y);
  }
}

/** Vertical line marking the instant being shown, like a playhead. */
function paintPlayhead(
  context: CanvasRenderingContext2D,
  layout: StageLayout,
  currentInstant: number,
  processCount: number,
): void {
  if (currentInstant < 0) return;

  const x = columnX(layout, currentInstant + 1);
  const top = rowY(layout, 0) - 4;
  const bottom = rowY(layout, processCount - 1) + layout.rowHeight + 4;

  context.strokeStyle = STAGE.playhead;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, top);
  context.lineTo(x, bottom);
  context.stroke();
}

/**
 * Draws one frame of the simulation onto a canvas.
 *
 * Reads the same `timeline` the table diagram and the CLI read, so the three
 * views cannot disagree. Stateless: every call repaints from scratch, which
 * keeps seeking and playing on the same code path.
 */
export function paintFrame(
  context: CanvasRenderingContext2D,
  frame: Frame,
  width: number,
  height: number,
): void {
  const columns = frame.timeline.length;
  context.clearRect(0, 0, width, height);
  context.fillStyle = STAGE.background;
  context.fillRect(0, 0, width, height);

  if (columns === 0 || frame.processCount === 0) return;

  const layout = layoutStage(width, height, columns, frame.processCount);
  const rows = buildDiagramRows(frame.timeline, frame.processCount);

  paintRuler(context, layout, columns, frame.currentInstant);
  paintLabels(context, layout, frame.processCount);

  for (const [rowIndex, row] of rows.entries()) {
    for (const [instant, state] of row.cells.entries()) {
      paintCell(
        context,
        layout,
        state,
        row.processId,
        instant,
        rowIndex,
        instant <= frame.currentInstant,
      );
    }
  }

  paintPlayhead(context, layout, frame.currentInstant, frame.processCount);
}
