// Every key Nexus stores in the cache, in one place.
//
// Bump CACHE_VERSION whenever the shape of a cached value changes (for example a new field on
// Movie or Availability). All keys then change at once, so old values are never read back in
// the new shape; they simply expire.

import { normaliseSearchQuery } from "@/contracts/api";

const CACHE_VERSION = "v1";

export function searchCacheKey(query: string): string {
  return `search:${CACHE_VERSION}:${normaliseSearchQuery(query)}`;
}

export function movieCacheKey(movieId: string): string {
  return `movie:${CACHE_VERSION}:${movieId}`;
}

export function availabilityCacheKey(movieId: string): string {
  return `availability:${CACHE_VERSION}:${movieId}`;
}
