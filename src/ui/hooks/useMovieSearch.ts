"use client";

import { useEffect, useState } from "react";
import { MIN_QUERY_LENGTH } from "@/contracts/api";
import type { Movie } from "@/domain/types";
import { searchMovies } from "@/ui/api-client";
import { requestWithSlowNotice, toRequestFailure, type RequestFailure } from "@/ui/api-request";
import { recallSearch, rememberSearch } from "@/ui/last-search";
import { isSplitView } from "@/ui/screen-size";

/** Wait this long after the last keystroke before searching, so typing doesn't spend lookups. */
const TYPING_PAUSE_MS = 350;

export type SearchState =
  | { status: "idle" }
  | { status: "loading"; isSlow: boolean }
  | { status: "done"; query: string; results: Movie[] }
  | RequestFailure;

/** Starts with the remembered results when they are for this query, so nothing flickers. */
function initialSearchState(query: string): SearchState {
  const remembered = recallSearch(query);
  if (remembered === null) {
    return { status: "idle" };
  }
  return { status: "done", query: remembered.answeredQuery, results: remembered.results };
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

interface MovieSearchOptions {
  /** What the visitor has typed. */
  query: string;
  /** The query the screen opened with, so remembered results show from the first paint. */
  initialQuery: string;
  /** True when the search sits next to a movie's answer (hidden on phones). */
  isBesideAnswer: boolean;
}

/**
 * Searches as the visitor types: waits for a pause, reuses the last results when the query
 * hasn't changed, and keeps the query in the address bar. Returns the search state, `retry`
 * for "Try again", and `clear` for when the query becomes too short.
 */
export function useMovieSearch({ query, initialQuery, isBesideAnswer }: MovieSearchOptions) {
  const [state, setState] = useState<SearchState>(() => initialSearchState(initialQuery));
  // Changing this runs the same search again.
  const [attempt, setAttempt] = useState(0);

  const trimmedQuery = query.trim();
  const isLongEnough = trimmedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!isLongEnough) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      // On a phone the search is hidden while a movie is open, so it shouldn't spend a lookup.
      if (isBesideAnswer && !isSplitView()) {
        return;
      }

      rememberQueryInAddressBar(trimmedQuery);
      const remembered = recallSearch(trimmedQuery);
      if (remembered !== null) {
        setState({ status: "done", query: remembered.answeredQuery, results: remembered.results });
        return;
      }

      setState({ status: "loading", isSlow: false });
      const response = await requestWithSlowNotice({
        send: (signal) => searchMovies(trimmedQuery, signal),
        signal: controller.signal,
        onSlow: () => setState({ status: "loading", isSlow: true }),
      });
      if (response === null) {
        return;
      }

      if (!response.ok) {
        setState(toRequestFailure(response.error));
        return;
      }
      const results = response.data.results;
      rememberSearch({ query: trimmedQuery, answeredQuery: response.data.query, results });
      setState({ status: "done", query: response.data.query, results });
    }, TYPING_PAUSE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery, isLongEnough, isBesideAnswer, attempt]);

  function retry() {
    setAttempt(attempt + 1);
  }

  function clear() {
    setState({ status: "idle" });
    rememberQueryInAddressBar("");
  }

  return { state, retry, clear };
}
