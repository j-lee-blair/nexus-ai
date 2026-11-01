"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { playIgnite, startDiscovery, type Discovery, type StreamTarget } from "./converge";
import { decodeText } from "./decode";
import { prefersReducedMotion, type Point } from "./motion";

/** Discovery runs at least this long, so a fast answer doesn't make the screen flicker. */
const MIN_DISCOVERY_MS = 450;
const REDUCED_MOTION_FADE_MS = 150;

export type RevealStatus = "loading" | "ready" | "failed";

interface RevealOptions {
  status: RevealStatus;
  /** True when the answer came from Nexus's cache: play the Ignite snap instead of Discovery. */
  cached: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Wraps the answer markup (AnswerView), which carries the data-reveal and data-decode hooks. */
  answerRef: RefObject<HTMLElement | null>;
}

/** Where the Discovery streams meet, and later shoot out from: the centre of the screen. */
function screenCentre(): Point {
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/** Where the Ignite line flashes: across the centre of the answer's summary line. */
function summaryCentre(answer: HTMLElement): Point {
  const summary = answer.querySelector('[data-reveal="heading"]');
  if (summary === null) {
    return screenCentre();
  }
  const box = summary.getBoundingClientRect();
  return { x: window.innerWidth / 2, y: box.top + box.height / 2 };
}

function showWithPop(element: HTMLElement) {
  element.style.visibility = "";
  element.animate([{ opacity: 0, transform: "scale(.97)" }, { opacity: 1, transform: "none" }], {
    duration: 180,
    easing: "ease-out",
  });
}

function showWithFade(element: HTMLElement) {
  element.style.visibility = "";
  element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
}

/**
 * Plays the Converge reveal over the answer screen (CLAUDE.md "Experience design"):
 * - while loading, Discovery streams gather at the nexus point;
 * - a fresh answer: streams fan out to each offer's row and the text decodes;
 * - a cached answer: the Ignite snap;
 * - reduced motion: a short fade instead.
 *
 * The answer's HTML is complete from the first moment; the reveal only hides parts of it
 * visually for well under a second. A tap or key press skips straight to the answer.
 * Returns whether the reveal is still playing, for aria-busy and the live announcement.
 */
export function useConvergeReveal({ status, cached, canvasRef, answerRef }: RevealOptions) {
  const [isRevealing, setIsRevealing] = useState(false);
  const discoveryRef = useRef<Discovery | null>(null);
  const loadStartRef = useRef(0);

  // Start gathering whenever the answer starts loading: when the screen opens, and again after
  // "Try again". It is stopped by the reveal below, or when the screen closes.
  useEffect(() => {
    if (status !== "loading") {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas === null || prefersReducedMotion()) {
      return;
    }

    discoveryRef.current?.stop();
    loadStartRef.current = performance.now();
    discoveryRef.current = startDiscovery(canvas, screenCentre());
  }, [status, canvasRef]);

  useEffect(() => {
    return () => discoveryRef.current?.stop();
  }, []);

  // A layout effect, so the parts still to be revealed are hidden before the browser paints.
  useLayoutEffect(() => {
    if (status === "failed") {
      discoveryRef.current?.stop();
      return;
    }
    if (status !== "ready") {
      return;
    }

    const canvas = canvasRef.current;
    const answer = answerRef.current;
    if (canvas === null || answer === null) {
      return;
    }

    const hiddenElements = Array.from(answer.querySelectorAll<HTMLElement>("[data-reveal]"));
    const decodes: { finish: () => void }[] = [];
    const cleanups: (() => void)[] = [];
    let finished = false;

    function finish() {
      if (finished) {
        return;
      }
      finished = true;
      discoveryRef.current?.stop();
      cleanups.forEach((cleanup) => cleanup());
      decodes.forEach((decode) => decode.finish());
      hiddenElements.forEach((element) => {
        element.style.visibility = "";
      });
      window.removeEventListener("pointerdown", finish, true);
      window.removeEventListener("keydown", finish, true);
      setIsRevealing(false);
    }

    setIsRevealing(true);
    window.addEventListener("pointerdown", finish, true);
    window.addEventListener("keydown", finish, true);

    if (prefersReducedMotion()) {
      const fade = answer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_MOTION_FADE_MS });
      fade.onfinish = finish;
      cleanups.push(() => fade.cancel());
      return finish;
    }

    if (cached) {
      discoveryRef.current?.stop();
      const stopIgnite = playIgnite(canvas, summaryCentre(answer), answer, finish);
      cleanups.push(stopIgnite);
      return finish;
    }

    hiddenElements.forEach((element) => {
      element.style.visibility = "hidden";
    });

    function fanOut() {
      const discovery = discoveryRef.current;
      if (discovery === null || answer === null) {
        finish();
        return;
      }

      const headings = hiddenElements.filter((element) => element.dataset.reveal === "heading");
      headings.forEach(showWithFade);
      decodes.push(decodeText(headings.filter((element) => element.hasAttribute("data-decode"))));

      const rows = hiddenElements.filter((element) => element.dataset.reveal === "offer");
      const targets: StreamTarget[] = rows.map((row) => toStreamTarget(row, decodes));

      const footer = hiddenElements.filter((element) => element.dataset.reveal === "footer");
      discovery.resolve(screenCentre(), targets, () => {
        footer.forEach(showWithFade);
        finish();
      });
    }

    const elapsed = performance.now() - loadStartRef.current;
    const remaining = Math.max(0, MIN_DISCOVERY_MS - elapsed);
    const timer = window.setTimeout(fanOut, remaining);
    cleanups.push(() => window.clearTimeout(timer));

    return finish;
  }, [status, cached, canvasRef, answerRef]);

  return { isRevealing };
}

/** A stream that lands on an offer's service chip and then shows and decodes that row. */
function toStreamTarget(row: HTMLElement, decodes: { finish: () => void }[]): StreamTarget {
  const chip = row.querySelector<HTMLElement>("[data-stream-hue]");

  let landing = row;
  let hue = 190;
  if (chip !== null) {
    landing = chip;
    hue = Number(chip.dataset.streamHue);
  }

  const box = landing.getBoundingClientRect();
  return {
    point: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
    hue,
    onArrive: () => {
      showWithPop(row);
      decodes.push(decodeText(Array.from(row.querySelectorAll("[data-decode]"))));
    },
  };
}
