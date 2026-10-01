import { describe, expect, it } from 'vitest';
import type { TimeSlice } from '@/engine';
import { paintFrame } from '../scene_painter';
import { processColor, STAGE } from '../scene_palette';

/**
 * Records the fill colors a paint pass used.
 *
 * A named fake rather than an inline stub: the painter only talks to the 2D
 * context, so capturing that conversation is the whole assertion surface.
 */
class RecordingContext {
  readonly fills: string[] = [];
  readonly strokes: string[] = [];
  readonly texts: string[] = [];

  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  font = '';
  textBaseline = '';
  textAlign = '';

  clearRect(): void {}
  beginPath(): void {}
  roundRect(): void {}
  moveTo(): void {}
  lineTo(): void {}
  setTransform(): void {}

  fillRect(): void {
    this.fills.push(this.fillStyle);
  }
  fill(): void {
    this.fills.push(this.fillStyle);
  }
  stroke(): void {
    this.strokes.push(this.strokeStyle);
  }
  fillText(text: string): void {
    this.texts.push(text);
  }
}

function asContext(fake: RecordingContext): CanvasRenderingContext2D {
  return fake as unknown as CanvasRenderingContext2D;
}

/** P1 runs for two seconds while P2 waits, then P2 runs. */
const TIMELINE: readonly TimeSlice[] = [
  { instant: 0, running: 1, ready: [2] },
  { instant: 1, running: 1, ready: [2] },
  { instant: 2, running: 2, ready: [] },
];

describe('paintFrame', () => {
  it('fills the running process with its own color', () => {
    const fake = new RecordingContext();
    paintFrame(asContext(fake), { timeline: TIMELINE, processCount: 2, currentInstant: 2 }, 600, 200);
    expect(fake.fills).toContain(processColor(1));
    expect(fake.fills).toContain(processColor(2));
  });

  it('leaves unreached instants unrevealed', () => {
    const fake = new RecordingContext();
    // Only instant 0 is revealed, so P2 never gets its running color.
    paintFrame(asContext(fake), { timeline: TIMELINE, processCount: 2, currentInstant: 0 }, 600, 200);
    expect(fake.fills).not.toContain(processColor(2));
  });

  it('draws nothing but the backdrop before the run starts', () => {
    const fake = new RecordingContext();
    paintFrame(asContext(fake), { timeline: TIMELINE, processCount: 2, currentInstant: -1 }, 600, 200);
    expect(fake.fills).toContain(STAGE.background);
    expect(fake.fills).not.toContain(processColor(1));
  });

  it('labels every process', () => {
    const fake = new RecordingContext();
    paintFrame(asContext(fake), { timeline: TIMELINE, processCount: 2, currentInstant: 2 }, 600, 200);
    expect(fake.texts).toContain('P1');
    expect(fake.texts).toContain('P2');
  });

  it('survives an empty timeline instead of throwing', () => {
    const fake = new RecordingContext();
    expect(() =>
      paintFrame(asContext(fake), { timeline: [], processCount: 0, currentInstant: -1 }, 600, 200),
    ).not.toThrow();
  });
});

describe('processColor', () => {
  it('cycles when there are more processes than colors', () => {
    expect(processColor(9)).toBe(processColor(1));
  });

  it('rejects an invalid id with the offending value', () => {
    expect(() => processColor(0)).toThrow(/Invalid process id: 0/);
  });
});
