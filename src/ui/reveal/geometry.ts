// Where on screen the Converge effects happen, measured from the answer's layout.

import { findFirstRevealPart } from "./markers";
import type { Point } from "./motion";

/** The centre of the screen, used when there is no answer area to measure. */
function screenCentre(): Point {
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/** The centre of an element's box on screen. */
export function centreOf(element: Element): Point {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/**
 * Where the Discovery streams meet, and later shoot out from: halfway down the screen, centred
 * over the answer. On a phone that is the middle of the screen; in the split view it is the
 * middle of the answer column, not of the whole window.
 */
export function nexusPoint(answer: HTMLElement | null): Point {
  if (answer === null) {
    return screenCentre();
  }
  const box = answer.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: window.innerHeight / 2 };
}

/**
 * Where the Ignite line flashes: the centre of the answer's summary line. Measured from the
 * summary itself, so it stays centred over the answer in the split view too.
 */
export function summaryCentre(answer: HTMLElement): Point {
  const summary = findFirstRevealPart(answer, "heading");
  if (summary === null) {
    return screenCentre();
  }
  return centreOf(summary);
}
