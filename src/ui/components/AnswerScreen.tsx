"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AvailabilityData } from "@/contracts/api";
import { getAvailability } from "@/ui/api-client";
import { availabilitySummary } from "@/ui/format";
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

      <div aria-busy={state.status === "loading"} className={styles.region}>
        <AnswerContent state={state} />
      </div>

      <p role="status" aria-live="polite" className="visually-hidden">
        <Announcement state={state} />
      </p>
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

/** What screen readers hear once the answer is ready. */
function Announcement({ state }: { state: AnswerState }) {
  if (state.status !== "ready") {
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
