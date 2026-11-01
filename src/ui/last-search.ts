// Remembers the results of the last search while the app is open. In the split view the search
// column is drawn again each time a movie is picked; with this it shows the same results straight
// away instead of asking the server again. Memory only: a page reload starts fresh.

import type { Movie } from "@/domain/types";

export interface RememberedSearch {
  /** What the visitor typed, trimmed: the key we look results up by. */
  query: string;
  /** The query as the server echoed it, used in the "No movies match" text. */
  answeredQuery: string;
  results: Movie[];
}

let lastSearch: RememberedSearch | null = null;

export function rememberSearch(search: RememberedSearch) {
  lastSearch = search;
}

/** The remembered results for exactly this query, or null. */
export function recallSearch(query: string): RememberedSearch | null {
  if (lastSearch === null) {
    return null;
  }
  if (lastSearch.query !== query.trim()) {
    return null;
  }
  return lastSearch;
}

/** Only for tests, so each test starts with nothing remembered. */
export function forgetSearch() {
  lastSearch = null;
}
