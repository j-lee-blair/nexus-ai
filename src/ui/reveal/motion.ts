// Small, pure helpers for the Converge reveal: easing, curves and text scrambling.
// No DOM here, so they can be unit tested.

export interface Point {
  x: number;
  y: number;
}

/** Clamps a progress value to 0–1. */
export function clampProgress(progress: number): number {
  if (progress < 0) {
    return 0;
  }
  if (progress > 1) {
    return 1;
  }
  return progress;
}

/** Fast start, gentle landing. */
export function easeOut(progress: number): number {
  const clamped = clampProgress(progress);
  return 1 - Math.pow(1 - clamped, 3);
}

/** A point on a curved path from `start` to `end`, bent towards `control`. */
export function pointOnCurve(start: Point, control: Point, end: Point, progress: number): Point {
  const remaining = 1 - progress;
  const startWeight = remaining * remaining;
  const controlWeight = 2 * remaining * progress;
  const endWeight = progress * progress;

  return {
    x: startWeight * start.x + controlWeight * control.x + endWeight * end.x,
    y: startWeight * start.y + controlWeight * control.y + endWeight * end.y,
  };
}

/** A random point just outside one of the four screen edges, where a stream enters. */
export function pointBeyondEdge(width: number, height: number, random: () => number): Point {
  const margin = 30;
  const edge = Math.floor(random() * 4);

  if (edge === 0) {
    return { x: random() * width, y: -margin };
  }
  if (edge === 1) {
    return { x: width + margin, y: random() * height };
  }
  if (edge === 2) {
    return { x: random() * width, y: height + margin };
  }
  return { x: -margin, y: random() * height };
}

/** Characters that look like raw data before the text decodes. */
export const DATA_GLYPHS = "01<>/\\";

/**
 * The text as it looks part-way through decoding: characters settle one by one from the left,
 * the rest show random data glyphs. Spaces stay spaces so the shape of the words is visible.
 */
export function scrambledText(
  finalText: string,
  elapsedMs: number,
  msPerCharacter: number,
  randomGlyph: () => string,
): string {
  const settledCount = Math.floor(elapsedMs / msPerCharacter);

  let result = "";
  for (let index = 0; index < finalText.length; index++) {
    const character = finalText[index];
    const isSettled = index < settledCount;
    if (isSettled || character === " ") {
      result += character;
    } else {
      result += randomGlyph();
    }
  }
  return result;
}

/** True when the visitor asked their system for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
