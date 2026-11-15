// Plays one reveal of a ready answer (CLAUDE.md "Experience design"). Plain functions, no React:
// useConvergeReveal decides when to call playReveal, this file decides what it looks like.

import { playIgnite, type StreamTarget } from "./converge";
import { decodeText } from "./decode";
import { centreOf, nexusPoint, summaryCentre } from "./geometry";
import { findDecodingText, findRevealParts, findStreamLanding, isDecoding, isRevealPart } from "./markers";
import { prefersReducedMotion } from "./motion";
import type { DiscoveryControls } from "./useDiscovery";

/** Discovery runs at least this long, so a fast answer doesn't make the screen flicker. */
const MIN_DISCOVERY_MS = 450;
const REDUCED_MOTION_FADE_MS = 150;
/** How long an offer row takes to pop in when its stream lands. */
const ROW_POP_MS = 180;
/** How long headings and the footer take to fade in. */
const FADE_IN_MS = 200;
/** Cyan, for a stream whose row has no service chip to take a colour from. */
const DEFAULT_STREAM_HUE = 190;

interface Decoding {
  finish: () => void;
}

/** One reveal in progress: what it hid, what is still running, and how to end it. */
interface Reveal {
  answer: HTMLElement;
  discovery: DiscoveryControls;
  /** Every marked part of the answer. Some reveals hide them first and show them one by one. */
  parts: HTMLElement[];
  decodings: Decoding[];
  /** Stops a timer or animation that may still be running when the reveal ends. */
  cleanups: (() => void)[];
  /** Ends the reveal now and shows the whole answer. Safe to call more than once. */
  finish: () => void;
}

function showWithPop(element: HTMLElement) {
  element.style.visibility = "";
  element.animate([{ opacity: 0, transform: "scale(.97)" }, { opacity: 1, transform: "none" }], {
    duration: ROW_POP_MS,
    easing: "ease-out",
  });
}

function showWithFade(element: HTMLElement) {
  element.style.visibility = "";
  element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_IN_MS });
}

/**
 * Sets up a reveal. A tap or key press anywhere ends it early. `onFinished` runs once when it
 * ends, whether it played out or was skipped.
 */
function startReveal(answer: HTMLElement, discovery: DiscoveryControls, onFinished: () => void): Reveal {
  let finished = false;

  const reveal: Reveal = {
    answer,
    discovery,
    parts: findRevealParts(answer),
    decodings: [],
    cleanups: [],
    finish,
  };

  function finish() {
    if (finished) {
      return;
    }
    finished = true;
    discovery.stop();
    reveal.cleanups.forEach((cleanup) => cleanup());
    reveal.decodings.forEach((decoding) => decoding.finish());
    reveal.parts.forEach((element) => {
      element.style.visibility = "";
    });
    window.removeEventListener("pointerdown", finish, true);
    window.removeEventListener("keydown", finish, true);
    onFinished();
  }

  window.addEventListener("pointerdown", finish, true);
  window.addEventListener("keydown", finish, true);
  return reveal;
}

/** Reduced motion: the whole answer fades in. */
function playFade(reveal: Reveal) {
  const fade = reveal.answer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_MOTION_FADE_MS });
  fade.onfinish = reveal.finish;
  reveal.cleanups.push(() => fade.cancel());
}

/** A cached answer: the Ignite snap. */
function playSnap(reveal: Reveal, canvas: HTMLCanvasElement) {
  reveal.discovery.stop();
  const stopIgnite = playIgnite(canvas, summaryCentre(reveal.answer), reveal.answer, reveal.finish);
  reveal.cleanups.push(stopIgnite);
}

/** A stream that lands on an offer's service chip and then shows and decodes that row. */
function streamToRow(row: HTMLElement, reveal: Reveal): StreamTarget {
  const landing = findStreamLanding(row);

  let landingElement: HTMLElement = row;
  let hue = DEFAULT_STREAM_HUE;
  if (landing !== null) {
    landingElement = landing.element;
    hue = landing.hue;
  }

  return {
    point: centreOf(landingElement),
    hue,
    onArrive: () => {
      showWithPop(row);
      reveal.decodings.push(decodeText(findDecodingText(row)));
    },
  };
}

/**
 * A fresh answer: headings fade in and decode, one stream per offer shoots from the nexus point
 * to that offer's row, and the footer fades in once every stream has landed.
 */
function fanOut(reveal: Reveal) {
  const discovery = reveal.discovery.current();
  if (discovery === null) {
    reveal.finish();
    return;
  }

  const headings = reveal.parts.filter((element) => isRevealPart(element, "heading"));
  headings.forEach(showWithFade);
  reveal.decodings.push(decodeText(headings.filter(isDecoding)));

  const rows = reveal.parts.filter((element) => isRevealPart(element, "offer"));
  const streams = rows.map((row) => streamToRow(row, reveal));

  const footers = reveal.parts.filter((element) => isRevealPart(element, "footer"));
  discovery.resolve(nexusPoint(reveal.answer), streams, () => {
    footers.forEach(showWithFade);
    reveal.finish();
  });
}

/** Hides the answer's parts, then fans out once Discovery has run for its minimum time. */
function playFanOut(reveal: Reveal) {
  reveal.parts.forEach((element) => {
    element.style.visibility = "hidden";
  });

  const remainingMs = Math.max(0, MIN_DISCOVERY_MS - reveal.discovery.elapsedMs());
  const timer = window.setTimeout(() => fanOut(reveal), remainingMs);
  reveal.cleanups.push(() => window.clearTimeout(timer));
}

interface PlayRevealOptions {
  answer: HTMLElement;
  canvas: HTMLCanvasElement;
  /** True when the answer came from Nexus's cache: play the Ignite snap instead of the fan-out. */
  cached: boolean;
  discovery: DiscoveryControls;
  onFinished: () => void;
}

/**
 * Reveals a ready answer: a short fade for reduced motion, the Ignite snap for a cached answer,
 * otherwise the Discovery fan-out. Returns a function that ends the reveal immediately.
 */
export function playReveal({ answer, canvas, cached, discovery, onFinished }: PlayRevealOptions): () => void {
  const reveal = startReveal(answer, discovery, onFinished);

  if (prefersReducedMotion()) {
    playFade(reveal);
  } else if (cached) {
    playSnap(reveal, canvas);
  } else {
    playFanOut(reveal);
  }

  return reveal.finish;
}
