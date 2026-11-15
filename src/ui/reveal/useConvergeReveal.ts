"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { playReveal } from "./play-reveal";
import { useDiscovery } from "./useDiscovery";

export type RevealStatus = "loading" | "ready" | "failed";

interface RevealOptions {
  status: RevealStatus;
  /** True when the answer came from Nexus's cache: play the Ignite snap instead of Discovery. */
  cached: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Wraps the answer markup (AnswerView), which carries the marks from ./markers. */
  answerRef: RefObject<HTMLElement | null>;
}

/**
 * Plays the Converge reveal over the answer screen (CLAUDE.md "Experience design"):
 * - while loading, Discovery streams gather at the nexus point (./useDiscovery);
 * - once the answer is ready, it is revealed (./play-reveal): streams fan out to each offer's
 *   row for a fresh answer, the Ignite snap for a cached one, a short fade for reduced motion.
 *
 * The answer's HTML is complete from the first moment; the reveal only hides parts of it
 * visually for well under a second. A tap or key press skips straight to the answer.
 * Returns whether the reveal is still playing, for aria-busy and the live announcement.
 */
export function useConvergeReveal({ status, cached, canvasRef, answerRef }: RevealOptions) {
  const [isRevealing, setIsRevealing] = useState(false);
  const discovery = useDiscovery(status === "loading", canvasRef, answerRef);

  // A layout effect, so the parts still to be revealed are hidden before the browser paints.
  useLayoutEffect(() => {
    if (status === "failed") {
      discovery.stop();
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

    setIsRevealing(true);
    const finishReveal = playReveal({
      answer,
      canvas,
      cached,
      discovery,
      onFinished: () => setIsRevealing(false),
    });
    return finishReveal;
  }, [status, cached, canvasRef, answerRef, discovery]);

  return { isRevealing };
}
