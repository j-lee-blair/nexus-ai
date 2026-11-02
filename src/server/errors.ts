import type { ErrorCode } from "@/contracts/api";

/** Shared by every place that gives up on the data provider, so they all say the same thing. */
export const PROVIDER_UNAVAILABLE_MESSAGE = "Movie data is unavailable right now. Try again soon.";

/**
 * An expected failure that maps directly onto an API error code. Lives outside the data-source
 * and Watchmode folders because both throw it.
 */
export class DataSourceError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "DataSourceError";
  }
}
