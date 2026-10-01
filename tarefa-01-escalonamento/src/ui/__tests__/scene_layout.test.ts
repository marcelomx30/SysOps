import { describe, expect, it } from 'vitest';
import { columnX, layoutStage, rowY, tickStep } from '../scene_layout';

describe('layoutStage', () => {
  it('divides the usable width among the columns', () => {
    const layout = layoutStage(800, 200, 10, 4);
    // 800 − 44 (labels) − 32 (padding) = 724, over 10 columns
    expect(layout.columnWidth).toBeCloseTo(72.4);
  });

  it('caps row height so few processes do not produce giant bars', () => {
    const layout = layoutStage(800, 600, 10, 2);
    expect(layout.rowHeight).toBeLessThanOrEqual(40);
  });

  it('keeps rows legible when many processes share a short canvas', () => {
    const layout = layoutStage(800, 120, 10, 12);
    expect(layout.rowHeight).toBeGreaterThanOrEqual(18);
  });

  it('rejects an empty stage rather than dividing by zero', () => {
    expect(() => layoutStage(800, 200, 0, 4)).toThrow(/columns=0/);
    expect(() => layoutStage(800, 200, 10, 0)).toThrow(/rows=0/);
  });
});

describe('columnX', () => {
  it('advances by one column width per instant', () => {
    const layout = layoutStage(800, 200, 10, 4);
    expect(columnX(layout, 1) - columnX(layout, 0)).toBeCloseTo(layout.columnWidth);
  });

  it('leaves room for the process labels before the first column', () => {
    const layout = layoutStage(800, 200, 10, 4);
    expect(columnX(layout, 0)).toBeGreaterThanOrEqual(layout.labelWidth);
  });
});

describe('rowY', () => {
  it('stacks rows without overlapping', () => {
    const layout = layoutStage(800, 200, 10, 4);
    expect(rowY(layout, 1)).toBeGreaterThanOrEqual(rowY(layout, 0) + layout.rowHeight);
  });
});

describe('tickStep', () => {
  it('labels every second when the columns are wide', () => {
    expect(tickStep(layoutStage(1200, 200, 8, 4))).toBe(1);
  });

  it('skips ticks when the columns are too narrow to label each one', () => {
    expect(tickStep(layoutStage(400, 200, 120, 4))).toBeGreaterThan(1);
  });
});
