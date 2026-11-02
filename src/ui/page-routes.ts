// Links to Nexus's own pages, built in one place so every screen links the same way.
// (Links to the API are in src/contracts/api.ts.)

/** The search page, with the query filled in when there is one. */
export function searchPagePath(query: string): string {
  if (query === "") {
    return "/";
  }
  return `/?q=${encodeURIComponent(query)}`;
}

/** A movie's answer page. The query is kept, so "Back to results" can restore the search. */
export function moviePagePath(movieId: string, query: string): string {
  return `/movie/${encodeURIComponent(movieId)}?q=${encodeURIComponent(query)}`;
}
