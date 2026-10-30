import type { WatchmodeParams, WatchmodeRequest } from "./types";

/** What a recorded fixture file contains. */
export interface WatchmodeFixture {
  request: { path: string; params: WatchmodeParams };
  recordedAt: string;
  response: unknown;
}

/**
 * File name for a request: the path plus its parameters in a fixed order, so the same request
 * always maps to the same file. Example: "search__search_field-name__search_value-parasite.json".
 */
export function fixtureFileName(request: Pick<WatchmodeRequest, "path" | "params">): string {
  const pathPart = request.path.replace(/^\/|\/$/g, "").replace(/\//g, "_");
  const sortedNames = Object.keys(request.params).sort();
  const paramParts = sortedNames.map((name) => `${name}-${request.params[name]}`);

  const raw = [pathPart, ...paramParts].join("__");
  const safe = raw.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return `${safe}.json`;
}
