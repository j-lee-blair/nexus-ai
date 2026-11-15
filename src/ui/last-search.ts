// Remembers the results of the last search while the app is open. In the split view the search
// column is drawn again each time a movie is picked; with this it shows the same results straight
// away instead of asking the server again. Memory only: a page reload starts fresh.

import { normaliseSearchQuery } from "@/contracts/api";
import type { Movie } from "@/domain/types";

export interface RememberedSearch {
  /** What the visitor typed, trimmed. Compared with normaliseSearchQuery, so case doesn't matter. */
  query: string;
  /** The query as the server echoed it, used in the "No movies match" text. */
  answeredQuery: string;
  results: Movie[];
}

let lastSearch: RememberedSearch | null = null;

export function rememberSearch(search: RememberedSearch) {
  lastSearch = search;
}

/** The remembered results for this query (ignoring case and surrounding spaces), or null. */
export function recallSearch(query: string): RememberedSearch | null {
  if (lastSearch === null) {
    return null;
  }

  const rememberedQuery = normaliseSearchQuery(lastSearch.query);
  const requestedQuery = normaliseSearchQuery(query);
  if (rememberedQuery !== requestedQuery) {
    return null;
  }
  return lastSearch;
}

/** Only for tests, so each test starts with nothing remembered. */
export function forgetSearch() {
  lastSearch = null;
}
