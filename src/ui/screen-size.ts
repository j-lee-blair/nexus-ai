import { matchesMediaQuery } from "./media-query";

// From this width (tablet and up) Nexus shows the split view: search on the left, the answer on
// the right (docs/features.md, F14). The stylesheets use the same 768px in their @media rules,
// because CSS can't import this constant; change both together.
export const SPLIT_VIEW_MEDIA_QUERY = "(min-width: 768px)";

/** True when the screen is wide enough for the split view. */
export function isSplitView(): boolean {
  return matchesMediaQuery(SPLIT_VIEW_MEDIA_QUERY);
}
