"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AvailabilityData } from "@/contracts/api";
import { getAvailability } from "@/ui/api-client";
import { availabilitySummary } from "@/ui/format";
import { useConvergeReveal } from "@/ui/reveal/useConvergeReveal";
import { AnswerView } from "./AnswerView";
import { Wordmark } from "./Wordmark";
import styles from "./AnswerScreen.module.css";

type AnswerState =
  | { status: "loading" }
  | { status: "ready"; availability: AvailabilityData; checkedAt: string; cached: boolean }
  | { status: "failed"; message: string };

interface AnswerScreenProps {
  movieId: string;
  /** The search that led here, so "Back to results" can restore it. */
  query: string;
}

export function AnswerScreen({ movieId, query }: AnswerScreenProps) {
  const [state, setState] = useState<AnswerState>({ status: "loading" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  let cached = false;
  if (state.status === "ready") {
    cached = state.cached;
  }
  const { isRevealing } = useConvergeReveal({ status: state.status, cached, canvasRef, answerRef });
  const isBusy = state.status === "loading" || isRevealing;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      let response;
      try {
        response = await getAvailability(movieId, controller.signal);
      } catch {
        // Cancelled because the user left this screen.
        return;
      }

      if (!response.ok) {
        setState({ status: "failed", message: response.error.message });
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
  }, [movieId]);

  let backHref = "/";
  let backLabel = "New search";
  if (query !== "") {
    backHref = `/?q=${encodeURIComponent(query)}`;
    backLabel = "Back to results";
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <Wordmark />
        <Link href={backHref} className={styles.back}>
          ← {backLabel}
        </Link>
      </header>

      <div ref={answerRef} aria-busy={isBusy} className={styles.region}>
        <AnswerContent state={state} />
      </div>

      <p role="status" aria-live="polite" className="visually-hidden">
        <Announcement state={state} isRevealing={isRevealing} />
      </p>

      {/* The Converge reveal draws here. Decoration only, so hidden from screen readers. */}
      <canvas ref={canvasRef} className={styles.effects} aria-hidden="true" />
    </main>
  );
}

function AnswerContent({ state }: { state: AnswerState }) {
  if (state.status === "loading") {
    return <p className={styles.loading}>Finding where to stream…</p>;
  }

  if (state.status === "failed") {
    return <p className={styles.problem}>{state.message}</p>;
  }

  const now = new Date();
  return <AnswerView availability={state.availability} checkedAt={state.checkedAt} now={now} />;
}

/** What screen readers hear once the answer is ready and the reveal has finished. */
function Announcement({ state, isRevealing }: { state: AnswerState; isRevealing: boolean }) {
  if (state.status !== "ready" || isRevealing) {
    return null;
  }

  const title = state.availability.movie.title;
  const summary = availabilitySummary(state.availability.groups);
  return (
    <>
      {title}: {summary}.
    </>
  );
}
