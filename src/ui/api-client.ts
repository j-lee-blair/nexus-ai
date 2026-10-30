// The browser's only way to talk to the Nexus server. Follows src/contracts/api.ts.

import {
  API_ROUTES,
  type ApiResponse,
  type AvailabilityResponse,
  type SearchResponse,
} from "@/contracts/api";

/** Used when the request never got an answer, e.g. the phone is offline. */
function unreachable<T>(): ApiResponse<T> {
  return {
    ok: false,
    error: {
      code: "provider_unavailable",
      message: "Nexus could not be reached. Check your connection and try again.",
    },
  };
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    // A cancelled request is expected (the user kept typing); let the caller ignore it.
    if (signal.aborted) {
      throw error;
    }
    return unreachable<T>();
  }

  try {
    const body = (await response.json()) as ApiResponse<T>;
    return body;
  } catch {
    return unreachable<T>();
  }
}

export function searchMovies(query: string, signal: AbortSignal): Promise<SearchResponse> {
  const url = `${API_ROUTES.search}?q=${encodeURIComponent(query)}`;
  return getJson(url, signal);
}

export function getAvailability(movieId: string, signal: AbortSignal): Promise<AvailabilityResponse> {
  const url = API_ROUTES.availability(movieId);
  return getJson(url, signal);
}
