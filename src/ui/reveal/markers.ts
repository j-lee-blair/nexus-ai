// The marks the Converge reveal looks for in the answer's HTML. AnswerView puts them on its
// elements and the reveal finds them again, so both sides use this file: renaming a mark here
// changes both, instead of silently breaking the animation.

/** Which part of the answer an element is, for the order in which the reveal shows them. */
export type RevealPart = "heading" | "offer" | "footer";

const REVEAL_ATTRIBUTE = "data-reveal";
const DECODE_ATTRIBUTE = "data-decode";
const STREAM_HUE_ATTRIBUTE = "data-stream-hue";

// --- Used by AnswerView, spread onto elements: <p {...revealPart("heading")}>

/** Hidden at the start of the reveal and shown again as `part`. */
export function revealPart(part: RevealPart) {
  return { [REVEAL_ATTRIBUTE]: part };
}

/** Text that decodes from data glyphs into the real words. */
export const decodes = { [DECODE_ATTRIBUTE]: true };

/** Where an offer's stream lands, and the stream's colour. */
export function streamLanding(hue: number) {
  return { [STREAM_HUE_ATTRIBUTE]: hue };
}

// --- Used by the reveal, to find the marked elements again

/** Every element marked with revealPart, in page order. */
export function findRevealParts(container: Element): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(`[${REVEAL_ATTRIBUTE}]`);
  return Array.from(elements);
}

/** The first element marked as `part`, or null. */
export function findFirstRevealPart(container: Element, part: RevealPart): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[${REVEAL_ATTRIBUTE}="${part}"]`);
}

export function isRevealPart(element: Element, part: RevealPart): boolean {
  return element.getAttribute(REVEAL_ATTRIBUTE) === part;
}

export function isDecoding(element: Element): boolean {
  return element.hasAttribute(DECODE_ATTRIBUTE);
}

/** The decoding elements inside `container`. */
export function findDecodingText(container: Element): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(`[${DECODE_ATTRIBUTE}]`);
  return Array.from(elements);
}

/** The stream landing inside an offer row, with its hue, or null when there is none. */
export function findStreamLanding(row: Element): { element: HTMLElement; hue: number } | null {
  const element = row.querySelector<HTMLElement>(`[${STREAM_HUE_ATTRIBUTE}]`);
  if (element === null) {
    return null;
  }
  const hue = Number(element.getAttribute(STREAM_HUE_ATTRIBUTE));
  return { element, hue };
}
