/** Where each piece of the stage sits, in CSS pixels. */
export interface StageLayout {
  readonly labelWidth: number;
  readonly rulerHeight: number;
  readonly rowHeight: number;
  readonly rowGap: number;
  readonly cellGap: number;
  readonly columnWidth: number;
  readonly width: number;
  readonly height: number;
}

/** Padding around the drawing area. */
const PADDING = 16;
const LABEL_WIDTH = 44;
const RULER_HEIGHT = 22;
const ROW_GAP = 6;
const CELL_GAP = 2;

/** Rows shrink on small canvases but never below this, or labels collide. */
const MIN_ROW_HEIGHT = 18;
const MAX_ROW_HEIGHT = 40;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * Computes the stage geometry for a given canvas size and simulation shape.
 *
 * Pure arithmetic, kept out of the painter so the layout can be unit-tested
 * without a canvas context.
 *
 * @example
 * layoutStage(800, 200, 14, 4).columnWidth; // width of one second column
 */
export function layoutStage(
  width: number,
  height: number,
  columns: number,
  rows: number,
): StageLayout {
  if (columns <= 0 || rows <= 0) {
    throw new Error(
      `Invalid stage shape: columns=${columns}, rows=${rows}. Expected both > 0.`,
    );
  }

  const usableHeight = height - RULER_HEIGHT - PADDING * 2;
  const perRow = (usableHeight - ROW_GAP * (rows - 1)) / rows;
  const rowHeight = clamp(perRow, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT);

  const usableWidth = width - LABEL_WIDTH - PADDING * 2;
  const columnWidth = usableWidth / columns;

  return {
    labelWidth: LABEL_WIDTH,
    rulerHeight: RULER_HEIGHT,
    rowHeight,
    rowGap: ROW_GAP,
    cellGap: CELL_GAP,
    columnWidth,
    width,
    height,
  };
}

/** Left edge of the column for `instant`, in canvas pixels. */
export function columnX(layout: StageLayout, instant: number): number {
  return PADDING + layout.labelWidth + instant * layout.columnWidth;
}

/** Top edge of the row for `rowIndex` (0-based), in canvas pixels. */
export function rowY(layout: StageLayout, rowIndex: number): number {
  return PADDING + layout.rulerHeight + rowIndex * (layout.rowHeight + layout.rowGap);
}

/**
 * How many ruler ticks to skip so labels do not overlap.
 *
 * A 60-second run on a narrow canvas cannot show every number; this picks the
 * smallest step that keeps roughly 28px between labels.
 */
export function tickStep(layout: StageLayout): number {
  const minSpacing = 28;
  return Math.max(1, Math.ceil(minSpacing / layout.columnWidth));
}
