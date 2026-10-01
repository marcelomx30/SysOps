// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BEFORE_START, SPEEDS } from '../playback_contract';
import {
  advancePlayback, clampInstant, resetPlayback, seekPlayback, startPlayback,
  tickDuration, usePlayback, type PlaybackModel,
} from '../playback_model';
import { PlaybackControls } from '../playback_controls';
import { TimeDiagram } from '../time_diagram';
import { Simulator } from '../simulator';

let root: Root;
let container: HTMLDivElement;
let playback: PlaybackModel;

function Harness({ length }: { readonly length: number }): null {
  playback = usePlayback(length);
  return null;
}

function renderHook(length: number): void {
  act(() => root.render(createElement(Harness, { length })));
}

function elapse(milliseconds: number): void {
  act(() => vi.advanceTimersByTime(milliseconds));
}

beforeEach(() => {
  vi.useFakeTimers();
  // The playback integration does not need a raster renderer in jsdom.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('playback calculations', () => {
  it('clamps to drawable bounds, including an empty timeline', () => {
    expect(clampInstant(-9, 4)).toBe(BEFORE_START);
    expect(clampInstant(99, 4)).toBe(3);
    expect(clampInstant(2, 0)).toBe(BEFORE_START);
  });

  it('advances one slice and stops at the last one', () => {
    const first = advancePlayback(startPlayback(resetPlayback(), 2), 2);
    expect(first.currentInstant).toBe(0);
    const last = advancePlayback(first, 2);
    expect(last).toEqual({ currentInstant: 1, isPlaying: false, speed: 1 });
    expect(advancePlayback(last, 2)).toBe(last);
  });

  it('seeking to the end pauses and play restarts before the first slice', () => {
    const end = seekPlayback(startPlayback(resetPlayback(), 3), 99, 3);
    expect(end.isPlaying).toBe(false);
    expect(startPlayback(end, 3).currentInstant).toBe(BEFORE_START);
    expect(startPlayback(resetPlayback(), 0).isPlaying).toBe(false);
  });

  it('rejects non-finite seek values instead of corrupting the playhead', () => {
    for (const instant of [NaN, Infinity, -Infinity]) {
      expect(() => seekPlayback(resetPlayback(), instant, 4))
        .toThrow(`Received instant ${instant}; expected a finite number.`);
    }
    expect(seekPlayback(resetPlayback(), 1.8, 4).currentInstant).toBe(1);
  });

  it('rejects unsupported speeds with the received and expected values', () => {
    expect(() => tickDuration(3)).toThrow('Received speed 3; expected one of 0.5, 1, 2, 4.');
  });
});

describe('usePlayback clock', () => {
  it('starts blank, advances, pauses, resumes and stops without wrapping', () => {
    renderHook(2);
    expect(playback.currentInstant).toBe(BEFORE_START);
    act(() => playback.play());
    elapse(1000);
    expect(playback.currentInstant).toBe(0);
    act(() => playback.pause());
    elapse(2000);
    expect(playback.currentInstant).toBe(0);
    act(() => playback.toggle());
    elapse(1000);
    expect(playback.currentInstant).toBe(1);
    expect(playback.isPlaying).toBe(false);
    elapse(5000);
    expect(playback.currentInstant).toBe(1);
  });

  it.each(SPEEDS)('advances at %s simulated seconds per real second', (speed: number) => {
    renderHook(10);
    act(() => { playback.setSpeed(speed); playback.play(); });
    elapse(1000 / speed - 1);
    expect(playback.currentInstant).toBe(BEFORE_START);
    elapse(1);
    expect(playback.currentInstant).toBe(0);
    elapse(1000 / speed);
    expect(playback.currentInstant).toBe(1);
  });

  it('replaces the timer when speed changes and clears it on unmount', () => {
    renderHook(10);
    act(() => playback.play());
    elapse(1000);
    act(() => playback.setSpeed(4));
    expect(vi.getTimerCount()).toBe(1);
    elapse(250);
    expect(playback.currentInstant).toBe(1);
    act(() => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
    root = createRoot(container);
  });

  it('resets when length changes and preserves the selected speed', () => {
    renderHook(10);
    act(() => { playback.setSpeed(2); playback.play(); });
    elapse(1000);
    renderHook(5);
    expect(playback.currentInstant).toBe(BEFORE_START);
    expect(playback.isPlaying).toBe(false);
    expect(playback.speed).toBe(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clamps seek, restarts at the end, resets and handles empty timelines', () => {
    renderHook(2);
    act(() => playback.seek(99));
    expect(playback.currentInstant).toBe(1);
    act(() => playback.play());
    expect(playback.currentInstant).toBe(BEFORE_START);
    elapse(1000);
    act(() => playback.reset());
    expect(playback.isPlaying).toBe(false);
    expect(playback.currentInstant).toBe(BEFORE_START);
    renderHook(0);
    act(() => playback.play());
    expect(playback.isPlaying).toBe(false);
  });
});

describe('playback integration', () => {
  it('exposes accessible controls and marks future/current diagram columns', () => {
    renderHook(2);
    act(() => root.render(createElement(PlaybackControls, { playback, timelineLength: 2 })));
    expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Instante da simulação');
    expect(container.querySelector('button')?.getAttribute('aria-pressed')).toBe('false');
    const props = { timeline: [{ instant: 0, running: 1, ready: [] }, { instant: 1, running: 1, ready: [] }], processCount: 1 };
    act(() => root.render(createElement(TimeDiagram, { ...props, currentInstant: 0 })));
    expect(container.querySelectorAll('td.playback-future')).toHaveLength(1);
    expect(container.querySelectorAll('td.playback-current')).toHaveLength(1);
    act(() => root.render(createElement(TimeDiagram, props)));
    expect([...container.querySelectorAll('td')].map((cell) => cell.className)).toEqual(['running', 'running']);
  });

  it('resets after same-length input changes and algorithm selection', () => {
    act(() => root.render(createElement(Simulator)));
    const seek = (): HTMLInputElement => container.querySelector<HTMLInputElement>('input[type="range"]')!;
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Avançar um instante"]')!.click());
    expect(seek().value).toBe('0');
    act(() => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Simular novamente')!.click());
    expect(seek().value).toBe('-1');
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Avançar um instante"]')!.click());
    act(() => {
      const select = container.querySelector('select')!;
      select.value = '1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(seek().value).toBe('-1');
  });
});

function changeInput(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

it('resets even when an invalid edit preserves the last valid timeline', () => {
  act(() => root.render(createElement(Simulator)));
  act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Reproduzir simulação"]')!.click());
  elapse(1000);
  const seek = container.querySelector<HTMLInputElement>('input[type="range"]')!;
  expect(seek.value).toBe('0');
  changeInput(container.querySelector<HTMLInputElement>('.params input')!, 'invalid');
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(seek.value).toBe('-1');
  expect(vi.getTimerCount()).toBe(0);
});
