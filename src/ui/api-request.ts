// The part of loading something from the API that both screens share: the request itself,
// cancelling it, and noticing when it is slow.

import type { ApiFailure, ApiResponse, ErrorCode } from "@/contracts/api";

/** After this long, a screen admits that the answer is slow in coming. */
export const SLOW_AFTER_MS = 4000;

/** How a screen remembers a request that failed. The wording comes from src/ui/problems.ts. */
export interface RequestFailure {
  status: "failed";
  code: ErrorCode;
  retryAfterSeconds?: number;
}

interface RequestOptions<T> {
  /** The api-client call to make, e.g. `(signal) => getAvailability(movieId, signal)`. */
  send: (signal: AbortSignal) => Promise<ApiResponse<T>>;
  signal: AbortSignal;
  /** Called once if the answer takes longer than SLOW_AFTER_MS. */
  onSlow: () => void;
}

/**
 * Sends one request. Returns the response, or null when the request was cancelled (the screen
 * closed, or the visitor typed again), in which case the caller should do nothing.
 */
export async function requestWithSlowNotice<T>({ send, signal, onSlow }: RequestOptions<T>) {
  const slowTimer = window.setTimeout(onSlow, SLOW_AFTER_MS);
  // A cancelled request must not report itself as slow later.
  signal.addEventListener("abort", () => window.clearTimeout(slowTimer));

  try {
    const response = await send(signal);
    return response;
  } catch {
    return null;
  } finally {
    window.clearTimeout(slowTimer);
  }
}

/** The failure to remember for an error response. */
export function toRequestFailure(error: ApiFailure["error"]): RequestFailure {
  return {
    status: "failed",
    code: error.code,
    retryAfterSeconds: error.retryAfterSeconds,
  };
}
