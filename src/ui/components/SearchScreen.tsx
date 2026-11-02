"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { MIN_QUERY_LENGTH } from "@/contracts/api";
import type { Movie } from "@/domain/types";
import { movieDetails } from "@/ui/format";
import { useMovieSearch, type SearchState } from "@/ui/hooks/useMovieSearch";
import { moviePagePath } from "@/ui/page-routes";
import { rememberSelectedMovie } from "@/ui/selected-movie";
import { Poster } from "./Poster";
import { Problem } from "./Problem";
import { Wordmark } from "./Wordmark";
import styles from "./SearchScreen.module.css";

interface SearchScreenProps {
  /** The query from the address bar, so Back from a movie returns to the same results. */
  initialQuery: string;
  /**
   * Set when this search sits in the split view's left column next to a movie's answer: the
   * movie whose answer is showing. Its result is highlighted.
   */
  selectedMovieId?: string;
}

export function SearchScreen({ initialQuery, selectedMovieId }: SearchScreenProps) {
  const [query, setQuery] = useState(initialQuery);
  const hintId = useId();

  const trimmedQuery = query.trim();
  const isLongEnough = trimmedQuery.length >= MIN_QUERY_LENGTH;
  const isBesideAnswer = selectedMovieId !== undefined;
  const { state, retry, clear } = useMovieSearch({ query, initialQuery, isBesideAnswer });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value;
    setQuery(nextQuery);

    const nextIsLongEnough = nextQuery.trim().length >= MIN_QUERY_LENGTH;
    if (!nextIsLongEnough) {
      clear();
    }
  }

  const content = (
    <>
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
          autoFocus={!isBesideAnswer}
          aria-describedby={hintId}
        />
        <p id={hintId} className={styles.hint}>
          <SearchHint query={trimmedQuery} isLongEnough={isLongEnough} state={state} />
        </p>
      </form>

      {state.status === "failed" && (
        <Problem code={state.code} retryAfterSeconds={state.retryAfterSeconds} onRetry={retry} />
      )}

      <SearchResults state={state} query={trimmedQuery} selectedMovieId={selectedMovieId} />
    </>
  );

  // Beside an answer the answer is the page's main content, and the search is secondary.
  if (isBesideAnswer) {
    return (
      <aside className={styles.screen} aria-label="Search">
        {content}
      </aside>
    );
  }
  return <main className={styles.screen}>{content}</main>;
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
  } else if (state.status === "loading" && state.isSlow) {
    text = "Still searching. This is taking longer than usual.";
  } else if (state.status === "loading") {
    text = "Searching…";
  } else if (state.status === "failed") {
    text = "The search didn't work.";
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
  selectedMovieId?: string;
}

function SearchResults({ state, query, selectedMovieId }: SearchResultsProps) {
  if (state.status !== "done" || state.results.length === 0) {
    return null;
  }

  return (
    <ul className={styles.results} aria-label="Search results">
      {state.results.map((movie) => (
        <li key={movie.id}>
          <ResultLink movie={movie} query={query} isSelected={movie.id === selectedMovieId} />
        </li>
      ))}
    </ul>
  );
}

interface ResultLinkProps {
  movie: Movie;
  query: string;
  /** The movie whose answer is showing beside the results. */
  isSelected: boolean;
}

function ResultLink({ movie, query, isSelected }: ResultLinkProps) {
  const href = moviePagePath(movie.id, query);

  let current: "page" | undefined = undefined;
  if (isSelected) {
    current = "page";
  }

  return (
    <Link
      href={href}
      className={styles.result}
      aria-current={current}
      onClick={() => rememberSelectedMovie(movie)}
    >
      <Poster movie={movie} size="small" />
      <span className={styles.resultText}>
        <span className={styles.resultTitle}>{movie.title}</span>
        <span className={styles.resultDetails}>{movieDetails(movie)}</span>
      </span>
    </Link>
  );
}
