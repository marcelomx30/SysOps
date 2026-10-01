/**
 * Colors for the animated stage, taken from Manim's official palette
 * (`manim.utils.color.manim_colors`), the same one the rendered video uses.
 *
 * Keeping the exact values — rather than approximations — is what makes the
 * canvas stage and the Manim clip read as one piece.
 */
const PROCESS_COLORS: readonly string[] = [
  '#58C4DD', // BLUE_C
  '#FC6255', // RED_C
  '#5CD0B3', // TEAL_C
  '#F7D96F', // YELLOW_C
  '#9A72AC', // PURPLE_C
  '#83C167', // GREEN_C
  '#F0AC5F', // GOLD_C
  '#C55F73', // MAROON_C
];

/** Stage chrome, matching the video's navy backdrop and chalk-white text. */
export const STAGE = {
  background: '#0E1525',
  emptyCell: '#141C2E',
  emptyBorder: '#1E2A3E',
  chalk: '#ECECEC',
  muted: '#9AA3B2',
  playhead: '#F7D96F',
} as const;

/**
 * Stable color for a process, derived from its id.
 *
 * Ids are 1-based (P1, P2, …), hence the offset. Inputs with more processes
 * than the palette cycle through it rather than failing.
 *
 * @example
 * processColor(1); // '#58C4DD' — BLUE_C
 */
export function processColor(id: number): string {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`Invalid process id: ${id}. Expected an integer >= 1.`);
  }
  return PROCESS_COLORS[(id - 1) % PROCESS_COLORS.length];
}
