/** Length of the hero video, in seconds (450 frames at 30 fps). */
export const VIDEO_DURATION_SECONDS = 15;

const FRAME_SECONDS = 1 / 30;
/** Seeking to the exact end can land past the last decodable frame; stop one frame short. */
const LAST_FRAME_SECONDS = VIDEO_DURATION_SECONDS - FRAME_SECONDS;

export interface HeroAct {
  readonly title: string;
  readonly summary: string;
  /** Instant of the video at which this act begins. */
  readonly startSeconds: number;
}

/** The five acts of the video, in order. Start times come from the render's timestamps. */
export const HERO_ACTS: readonly HeroAct[] = [
  {
    title: 'Chegada',
    summary:
      'Os processos chegam e formam uma fila. Cada um tem um instante de criação, uma duração e uma prioridade.',
    startSeconds: 0,
  },
  {
    title: 'Escolha',
    summary: 'A CPU atende um processo por vez. Quem espera acumula tempo de espera (tw).',
    startSeconds: 3,
  },
  {
    title: 'Fatia de tempo',
    summary:
      'No Round-Robin, cada processo usa a CPU por um quantum e volta para o fim da fila.',
    startSeconds: 6,
  },
  {
    title: 'Envelhecimento',
    summary:
      'Quem espera muito ganha prioridade (aging), para não ficar esquecido na fila (starvation).',
    startSeconds: 9,
  },
  {
    title: 'Resultado',
    summary:
      'O simulador compara tempo de vida, tempo de espera e trocas de contexto. Agora é a sua vez.',
    startSeconds: 12,
  },
];

/**
 * How far through the pinned section the user has scrolled, from 0 to 1.
 *
 * The section is `containerHeight` tall and its stage stays pinned for
 * `containerHeight - viewportHeight` pixels; `containerTop` is the section's
 * distance from the top of the viewport (negative once it has scrolled past).
 */
export function scrollProgress(
  containerTop: number,
  containerHeight: number,
  viewportHeight: number,
): number {
  const scrollable = containerHeight - viewportHeight;
  if (scrollable <= 0) return 0;
  return clamp01(-containerTop / scrollable);
}

/** Video instant that corresponds to a scroll progress. */
export function progressToTime(progress: number): number {
  return Math.min(clamp01(progress) * VIDEO_DURATION_SECONDS, LAST_FRAME_SECONDS);
}

/** Index of the act being shown at a given video instant. */
export function activeActIndex(seconds: number): number {
  let active = 0;
  HERO_ACTS.forEach((act, index) => {
    if (seconds >= act.startSeconds) active = index;
  });
  return active;
}

/** Scroll progress at which an act begins. Throws for an index outside the acts. */
export function actStartProgress(index: number): number {
  const act = HERO_ACTS[index];
  if (!act) {
    throw new Error(`Ato inexistente: ${index}. Esperado: 0 a ${HERO_ACTS.length - 1}.`);
  }
  return act.startSeconds / VIDEO_DURATION_SECONDS;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
