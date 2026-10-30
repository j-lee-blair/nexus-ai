"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { MIN_QUERY_LENGTH } from "@/contracts/api";
import type { Movie } from "@/domain/types";
import { searchMovies } from "@/ui/api-client";
import { Poster } from "./Poster";
import { Wordmark } from "./Wordmark";
import styles from "./SearchScreen.module.css";

/** Wait this long after the last keystroke before searching, so typing doesn't spend lookups. */
const TYPING_PAUSE_MS = 350;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; query: string; results: Movie[] }
  | { status: "failed"; message: string };

interface SearchScreenProps {
  /** The query from the address bar, so Back from a movie returns to the same results. */
  initialQuery: string;
}

export function SearchScreen({ initialQuery }: SearchScreenProps) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const hintId = useId();

  const trimmedQuery = query.trim();
  const isLongEnough = trimmedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!isLongEnough) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState({ status: "loading" });
      rememberQueryInAddressBar(trimmedQuery);

      let response;
      try {
        response = await searchMovies(trimmedQuery, controller.signal);
      } catch {
        // Cancelled because the user typed again; the next search takes over.
        return;
      }

      if (!response.ok) {
        setState({ status: "failed", message: response.error.message });
        return;
      }
      setState({ status: "done", query: response.data.query, results: response.data.results });
    }, TYPING_PAUSE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery, isLongEnough]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value;
    setQuery(nextQuery);

    const nextIsLongEnough = nextQuery.trim().length >= MIN_QUERY_LENGTH;
    if (!nextIsLongEnough) {
      setState({ status: "idle" });
      rememberQueryInAddressBar("");
    }
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <Wordmark />
        <p className={styles.tagline}>Where can I stream this?</p>
      </header>

      <form role="search" className={styles.form} onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="movie-search" className="visually-hidden">
          Movie title
        </label>
        <input
          id="movie-search"
          className={styles.input}
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Search for a movie"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus
          aria-describedby={hintId}
        />
        <p id={hintId} className={styles.hint}>
          <SearchHint query={trimmedQuery} isLongEnough={isLongEnough} state={state} />
        </p>
      </form>

      <SearchResults state={state} query={trimmedQuery} />
    </main>
  );
}

/** Keeps ?q= in the address bar without adding history entries for every keystroke. */
function rememberQueryInAddressBar(query: string) {
  const url = new URL(window.location.href);
  if (query === "") {
    url.searchParams.delete("q");
  } else {
    url.searchParams.set("q", query);
  }
  window.history.replaceState(null, "", url);
}

interface SearchHintProps {
  query: string;
  isLongEnough: boolean;
  state: SearchState;
}

/** One status line under the input. It is a live region, so screen readers hear changes. */
function SearchHint({ query, isLongEnough, state }: SearchHintProps) {
  let text = "Type a movie title, in Swedish or the original language.";

  if (query.length > 0 && !isLongEnough) {
    text = `Type at least ${MIN_QUERY_LENGTH} letters.`;
  } else if (state.status === "loading") {
    text = "Searching…";
  } else if (state.status === "failed") {
    text = state.message;
  } else if (state.status === "done") {
    const count = state.results.length;
    if (count === 0) {
      text = `No movies match “${state.query}”. Check the spelling or try another title.`;
    } else if (count === 1) {
      text = "1 movie found.";
    } else {
      text = `${count} movies found.`;
    }
  }

  return (
    <span role="status" aria-live="polite">
      {text}
    </span>
  );
}

interface SearchResultsProps {
  state: SearchState;
  query: string;
}

function SearchResults({ state, query }: SearchResultsProps) {
  if (state.status !== "done" || state.results.length === 0) {
    return null;
  }

  return (
    <ul className={styles.results} aria-label="Search results">
      {state.results.map((movie) => (
        <li key={movie.id}>
          <ResultLink movie={movie} query={query} />
        </li>
      ))}
    </ul>
  );
}

function ResultLink({ movie, query }: { movie: Movie; query: string }) {
  const href = `/movie/${encodeURIComponent(movie.id)}?q=${encodeURIComponent(query)}`;

  const details: string[] = [];
  if (movie.year !== null) {
    details.push(String(movie.year));
  }
  if (movie.originalTitle !== null && movie.originalTitle !== movie.title) {
    details.push(movie.originalTitle);
  }

  return (
    <Link href={href} className={styles.result}>
      <Poster movie={movie} size="small" />
      <span className={styles.resultText}>
        <span className={styles.resultTitle}>{movie.title}</span>
        <span className={styles.resultDetails}>{details.join(" · ")}</span>
      </span>
    </Link>
  );
}
