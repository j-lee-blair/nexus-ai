// Remembers the movie picked from the search results, so the answer screen can show its
// poster and title straight away while the availability loads. The movie data is what the
// data provider returned for the search; nothing is guessed.
//
// Stored in sessionStorage, which can be unavailable (private windows, blocked storage), so
// every access is wrapped. When nothing is remembered, the header waits for the answer.

import { useMemo, useSyncExternalStore } from "react";
import type { Movie } from "@/domain/types";

function storageKey(movieId: string): string {
  return `nexus:selected-movie:${movieId}`;
}

export function rememberSelectedMovie(movie: Movie) {
  try {
    window.sessionStorage.setItem(storageKey(movie.id), JSON.stringify(movie));
  } catch {
    // Storage unavailable: the header will appear with the answer instead.
  }
}

function readStoredMovie(movieId: string): string | null {
  try {
    return window.sessionStorage.getItem(storageKey(movieId));
  } catch {
    return null;
  }
}

// The remembered movie never changes while the answer screen is open, so there is nothing to
// subscribe to.
function subscribeToNothing() {
  return () => {};
}

/**
 * The movie remembered for this id, or null. On the server (where there is no storage) and
 * during the first render it is null; React then re-renders with the stored value.
 */
export function useSelectedMovie(movieId: string): Movie | null {
  const storedMovie = useSyncExternalStore(
    subscribeToNothing,
    () => readStoredMovie(movieId),
    () => null,
  );

  return useMemo(() => {
    if (storedMovie === null) {
      return null;
    }
    try {
      const movie = JSON.parse(storedMovie) as Movie;
      return movie;
    } catch {
      return null;
    }
  }, [storedMovie]);
}
