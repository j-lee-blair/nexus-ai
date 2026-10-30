import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailabilityResponse, SearchData, AvailabilityData, ApiResponse } from "@/contracts/api";
import { GET as search } from "./search/route";
import { GET as availability } from "./movies/[id]/availability/route";

async function callSearch(query: string) {
  const request = new Request(`http://localhost/api/search?q=${encodeURIComponent(query)}`);
  const response = await search(request);
  const body = (await response.json()) as ApiResponse<SearchData>;
  return { status: response.status, body };
}

async function callAvailability(movieId: string) {
  const request = new Request(`http://localhost/api/movies/${movieId}/availability`);
  const context = { params: Promise.resolve({ id: movieId }) };
  const response = await availability(request, context);
  const body = (await response.json()) as AvailabilityResponse;
  return { status: response.status, body };
}

/** Returns the success body, or fails the test with the error the API returned. */
function expectSuccess<T>(body: ApiResponse<T>) {
  if (!body.ok) {
    throw new Error(`Expected success, got ${body.error.code}: ${body.error.message}`);
  }
  return body;
}

/** Returns the error, or fails the test if the API succeeded. */
function expectFailure<T>(body: ApiResponse<T>) {
  if (body.ok) {
    throw new Error("Expected an error response, got success");
  }
  return body.error;
}

describe("API routes with the mock data source", () => {
  beforeEach(() => {
    vi.stubEnv("NEXUS_DATA_SOURCE", "mock");
    vi.stubEnv("NEXUS_MOCK_LATENCY_MS", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects queries shorter than 3 characters", async () => {
    const { status, body } = await callSearch("ab");

    expect(status).toBe(400);
    expect(expectFailure(body).code).toBe("invalid_query");
  });

  it("returns the same generated movies for the same search, and reports cached on repeat", async () => {
    const first = await callSearch("matrix");
    const firstBody = expectSuccess(first.body);
    const firstTitles = firstBody.data.results.map((movie) => movie.title);

    expect(firstTitles[0]).toBe("The Matrix");
    expect(firstBody.cached).toBe(false);

    const repeat = await callSearch("Matrix");
    const repeatBody = expectSuccess(repeat.body);
    const repeatTitles = repeatBody.data.results.map((movie) => movie.title);

    expect(repeatTitles).toEqual(firstTitles);
    expect(repeatBody.cached).toBe(true);
  });

  it("returns an empty list, not an error, when searching for 404", async () => {
    const { status, body } = await callSearch("404");

    expect(status).toBe(200);
    expect(expectSuccess(body).data.results).toEqual([]);
  });

  it("fails like a server bug when searching for 500", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, body } = await callSearch("500");

    expect(status).toBe(503);
    expect(expectFailure(body).code).toBe("provider_unavailable");
    consoleError.mockRestore();
  });

  it("returns grouped availability for a movie from the search results", async () => {
    const search = await callSearch("matrix");
    const firstMovie = expectSuccess(search.body).data.results[0];

    const { body } = await callAvailability(firstMovie.id);
    const data: AvailabilityData = expectSuccess(body).data;

    expect(data.movie).toEqual(firstMovie);
  });

  it("returns 404 not_found for an unknown movie", async () => {
    const { status, body } = await callAvailability("nope");

    expect(status).toBe(404);
    expect(expectFailure(body).code).toBe("not_found");
  });

  it("returns 503 provider_unavailable when Watchmode has no answer for the request", async () => {
    // Without the mock, development uses recorded Watchmode fixtures; "ferry" has none.
    vi.stubEnv("NEXUS_DATA_SOURCE", "");

    const { status, body } = await callSearch("ferry");

    expect(status).toBe(503);
    expect(expectFailure(body).code).toBe("provider_unavailable");
  });

  it("never serves mock data on Vercel production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    const { status } = await callSearch("ferry");

    expect(status).toBe(503);
  });
});
