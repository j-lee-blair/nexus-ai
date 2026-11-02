/**
 * True when the browser matches a CSS media query. Always false on the server and in browsers
 * without matchMedia, so callers get the phone / full-motion default there.
 */
export function matchesMediaQuery(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(query).matches;
}
