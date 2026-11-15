"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { startDiscovery, type Discovery } from "./converge";
import { nexusPoint } from "./geometry";
import { prefersReducedMotion } from "./motion";

/** What the reveal needs from the Discovery streams once the answer has arrived. */
export interface DiscoveryControls {
  /** The running Discovery, or null when none is running (reduced motion, or no canvas). */
  current: () => Discovery | null;
  /** How long the current Discovery has been gathering. */
  elapsedMs: () => number;
  /** Stops the streams straight away and clears the overlay. */
  stop: () => void;
}

/**
 * Runs the Discovery streams while the answer loads: when the screen opens, and again after
 * "Try again". They keep gathering until the reveal resolves or stops them, or the screen
 * closes.
 */
export function useDiscovery(
  isLoading: boolean,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  answerRef: RefObject<HTMLElement | null>,
): DiscoveryControls {
  const discoveryRef = useRef<Discovery | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas === null || prefersReducedMotion()) {
      return;
    }

    discoveryRef.current?.stop();
    startedAtRef.current = performance.now();
    discoveryRef.current = startDiscovery(canvas, nexusPoint(answerRef.current));
  }, [isLoading, canvasRef, answerRef]);

  useEffect(() => {
    return () => discoveryRef.current?.stop();
  }, []);

  // Created once, so the reveal's effect doesn't re-run because of a new object each render.
  const [controls] = useState<DiscoveryControls>(() => ({
    current: () => discoveryRef.current,
    elapsedMs: () => performance.now() - startedAtRef.current,
    stop: () => discoveryRef.current?.stop(),
  }));
  return controls;
}
