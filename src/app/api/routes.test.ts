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

  it("finds movies by original title and reports cached on repeat", async () => {
    const first = await callSearch("cinnamon");
    const firstBody = expectSuccess(first.body);
    const titles = firstBody.data.results.map((movie) => movie.title);

    expect(titles).toEqual(["Kanelbullar och krig"]);
    expect(firstBody.cached).toBe(false);

    const repeat = await callSearch("Cinnamon");
    const repeatBody = expectSuccess(repeat.body);

    expect(repeatBody.cached).toBe(true);
  });

  it("returns an empty list, not an error, when nothing matches", async () => {
    const { status, body } = await callSearch("zzzzzz");

    expect(status).toBe(200);
    expect(expectSuccess(body).data.results).toEqual([]);
  });

  it("returns grouped availability for a known movie", async () => {
    const { body } = await callAvailability("mock-1");
    const data: AvailabilityData = expectSuccess(body).data;
    const groupTypes = data.groups.map((group) => group.type);

    expect(groupTypes).toEqual(["subscription", "rent", "buy"]);
  });

  it("returns 404 not_found for an unknown movie", async () => {
    const { status, body } = await callAvailability("nope");

    expect(status).toBe(404);
    expect(expectFailure(body).code).toBe("not_found");
  });

  it("returns 503 provider_unavailable when no data source is configured", async () => {
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
