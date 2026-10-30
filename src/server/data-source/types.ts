import type { ErrorCode } from "@/contracts/api";
import type { Availability, Movie } from "@/domain/types";

export interface SourceResult<T> {
  data: T;
  cached: boolean;
  /** ISO 8601 time the data was fetched from the provider. */
  checkedAt: string;
}

/**
 * Where the server gets its answers. F0 ships a mock; the Watchmode-backed source
 * (F1–F5) implements the same interface, so routes and UI don't change.
 */
export interface DataSource {
  search(query: string): Promise<SourceResult<Movie[]>>;
  /** Rejects with DataSourceError("not_found") for unknown ids. */
  availability(movieId: string): Promise<SourceResult<Availability>>;
}

/** An expected failure that maps directly onto an API error code. */
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
