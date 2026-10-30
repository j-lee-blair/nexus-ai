// The HTTP contract between the browser and the Nexus server.
// UI code depends on this file and src/domain/types.ts only.

import type { Availability, Movie } from "@/domain/types";

export const API_ROUTES = {
  /** GET ?q=<title>. */
  search: "/api/search",
  /** GET. */
  availability: (movieId: string) => `/api/movies/${encodeURIComponent(movieId)}/availability`,
} as const;

/** Queries shorter than this are rejected with `invalid_query`, so they never cost credits. */
export const MIN_QUERY_LENGTH = 3;

export interface SearchData {
  query: string;
  /** Empty when nothing matches. That is a normal answer, not an error. */
  results: Movie[];
}

export type AvailabilityData = Availability;

export type ErrorCode =
  | "invalid_query" // 400: query missing or shorter than MIN_QUERY_LENGTH
  | "not_found" // 404: unknown movie id
  | "rate_limited" // 429: this visitor made too many fresh lookups
  | "quota_reached" // 503: Nexus's daily or monthly provider budget is used up
  | "provider_unavailable"; // 503: the data provider failed or timed out

export const ERROR_STATUS: Record<ErrorCode, number> = {
  invalid_query: 400,
  not_found: 404,
  rate_limited: 429,
  quota_reached: 503,
  provider_unavailable: 503,
};

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  /** True when served from Nexus's cache: the UI plays the Ignite snap instead of Discovery. */
  cached: boolean;
  /** ISO 8601 time the data was fetched from the provider. Shown as "checked … ago". */
  checkedAt: string;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: ErrorCode;
    /** Plain-language message, safe to show to users. */
    message: string;
    /** Set for rate_limited and quota_reached. */
    retryAfterSeconds?: number;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
export type SearchResponse = ApiResponse<SearchData>;
export type AvailabilityResponse = ApiResponse<AvailabilityData>;
