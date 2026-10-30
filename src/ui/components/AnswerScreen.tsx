"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AvailabilityData, ErrorCode } from "@/contracts/api";
import { getAvailability } from "@/ui/api-client";
import { availabilitySummary } from "@/ui/format";
import { useConvergeReveal } from "@/ui/reveal/useConvergeReveal";
import { useSelectedMovie } from "@/ui/selected-movie";
import { AnswerView, MovieHeader } from "./AnswerView";
import { Problem } from "./Problem";
import { Wordmark } from "./Wordmark";
import styles from "./AnswerScreen.module.css";

type AnswerState =
  | { status: "loading" }
  | { status: "ready"; availability: AvailabilityData; checkedAt: string; cached: boolean }
  | { status: "failed"; code: ErrorCode; retryAfterSeconds?: number };

/** After this long, the loading text admits the data provider is being slow. */
const SLOW_AFTER_MS = 4000;

interface AnswerScreenProps {
  movieId: string;
  /** The search that led here, so "Back to results" can restore it. */
  query: string;
}

export function AnswerScreen({ movieId, query }: AnswerScreenProps) {
  const [state, setState] = useState<AnswerState>({ status: "loading" });
  const [isSlow, setIsSlow] = useState(false);
  // Changing this loads the answer again ("Try again").
  const [attempt, setAttempt] = useState(0);
  const selectedMovie = useSelectedMovie(movieId);
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
    const slowTimer = window.setTimeout(() => setIsSlow(true), SLOW_AFTER_MS);

    async function load() {
      let response;
      try {
        response = await getAvailability(movieId, controller.signal);
      } catch {
        // Cancelled because the user left this screen.
        return;
      }

      window.clearTimeout(slowTimer);
      setIsSlow(false);

      if (!response.ok) {
        setState({
          status: "failed",
          code: response.error.code,
          retryAfterSeconds: response.error.retryAfterSeconds,
        });
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
    return () => {
      window.clearTimeout(slowTimer);
      controller.abort();
    };
  }, [movieId, attempt]);

  function tryAgain() {
    setState({ status: "loading" });
    setAttempt(attempt + 1);
  }

  // The answer's own movie data wins once it arrives; until then, the movie picked in search.
  let movie = selectedMovie;
  if (state.status === "ready") {
    movie = state.availability.movie;
  }

  let backHref = "/";
  let backLabel = "New search";
  if (query !== "") {
    backHref = `/?q=${encodeURIComponent(query)}`;
    backLabel = "Back to results";
  }

  // "Search again" goes to the search screen with the movie's title, when we know it.
  let searchHref = backHref;
  if (query === "" && movie !== null) {
    searchHref = `/?q=${encodeURIComponent(movie.title)}`;
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <Wordmark />
        <Link href={backHref} className={styles.back}>
          ← {backLabel}
        </Link>
      </header>

      {movie !== null && <MovieHeader movie={movie} />}

      <div ref={answerRef} aria-busy={isBusy} className={styles.region}>
        <AnswerContent state={state} isSlow={isSlow} onRetry={tryAgain} searchHref={searchHref} />
      </div>

      <p role="status" aria-live="polite" className="visually-hidden">
        <Announcement state={state} isRevealing={isRevealing} />
      </p>

      {/* The Converge reveal draws here. Decoration only, so hidden from screen readers. */}
      <canvas ref={canvasRef} className={styles.effects} aria-hidden="true" />
    </main>
  );
}

interface AnswerContentProps {
  state: AnswerState;
  isSlow: boolean;
  onRetry: () => void;
  searchHref: string;
}

function AnswerContent({ state, isSlow, onRetry, searchHref }: AnswerContentProps) {
  if (state.status === "loading") {
    let text = "Finding where to stream…";
    if (isSlow) {
      text = "Still looking. The data provider is slower than usual.";
    }
    return (
      <p className={styles.loading} role="status">
        {text}
      </p>
    );
  }

  if (state.status === "failed") {
    return (
      <Problem
        code={state.code}
        retryAfterSeconds={state.retryAfterSeconds}
        onRetry={onRetry}
        searchHref={searchHref}
      />
    );
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
