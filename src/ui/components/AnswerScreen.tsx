"use client";

import Link from "next/link";
import { useRef } from "react";
import { availabilitySummary } from "@/ui/format";
import { useAvailability, type AnswerState } from "@/ui/hooks/useAvailability";
import { useFocusWhenShown } from "@/ui/hooks/useFocusWhenShown";
import { searchPagePath } from "@/ui/page-routes";
import { useConvergeReveal } from "@/ui/reveal/useConvergeReveal";
import { useSelectedMovie } from "@/ui/selected-movie";
import { AnswerView, MovieHeader } from "./AnswerView";
import { Problem } from "./Problem";
import { Wordmark } from "./Wordmark";
import styles from "./AnswerScreen.module.css";

interface AnswerScreenProps {
  movieId: string;
  /** The search that led here, so "Back to results" can restore it. */
  query: string;
}

export function AnswerScreen({ movieId, query }: AnswerScreenProps) {
  const { state, isSlow, retry } = useAvailability(movieId);
  const selectedMovie = useSelectedMovie(movieId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  let cached = false;
  if (state.status === "ready") {
    cached = state.cached;
  }
  const { isRevealing } = useConvergeReveal({ status: state.status, cached, canvasRef, answerRef });
  const isBusy = state.status === "loading" || isRevealing;

  // The answer's own movie data wins once it arrives; until then, the movie picked in search.
  let movie = selectedMovie;
  if (state.status === "ready") {
    movie = state.availability.movie;
  }

  const isTitleShown = movie !== null;
  useFocusWhenShown(titleRef, isTitleShown);

  const backHref = searchPagePath(query);
  let backLabel = "New search";
  if (query !== "") {
    backLabel = "Back to results";
  }

  // "Search again" goes to the search screen with the movie's title, when we know it.
  let searchHref = backHref;
  if (query === "" && movie !== null) {
    searchHref = searchPagePath(movie.title);
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <Wordmark />
        <Link href={backHref} className={styles.back}>
          ← {backLabel}
        </Link>
      </header>

      {movie !== null && <MovieHeader movie={movie} titleRef={titleRef} />}

      <div ref={answerRef} aria-busy={isBusy} className={styles.region}>
        <AnswerContent state={state} isSlow={isSlow} onRetry={retry} searchHref={searchHref} />
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
