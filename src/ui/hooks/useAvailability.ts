"use client";

import { useEffect, useState } from "react";
import type { AvailabilityData } from "@/contracts/api";
import { getAvailability } from "@/ui/api-client";
import { requestWithSlowNotice, toRequestFailure, type RequestFailure } from "@/ui/api-request";

export type AnswerState =
  | { status: "loading" }
  | { status: "ready"; availability: AvailabilityData; checkedAt: string; cached: boolean }
  | RequestFailure;

/**
 * Loads where a movie is available. Returns the answer's state, whether it is slow in coming,
 * and `retry` for the "Try again" button.
 */
export function useAvailability(movieId: string) {
  const [state, setState] = useState<AnswerState>({ status: "loading" });
  const [isSlow, setIsSlow] = useState(false);
  // Changing this loads the answer again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const response = await requestWithSlowNotice({
        send: (signal) => getAvailability(movieId, signal),
        signal: controller.signal,
        onSlow: () => setIsSlow(true),
      });
      if (response === null) {
        return;
      }

      setIsSlow(false);
      if (!response.ok) {
        setState(toRequestFailure(response.error));
        return;
      }
      setState({
        status: "ready",
        availability: response.data,
        checkedAt: response.checkedAt,
        cached: response.cached,
      });
    }

    load();
    return () => controller.abort();
  }, [movieId, attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt(attempt + 1);
  }

  return { state, isSlow, retry };
}
