import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailabilityResponse, SearchResponse } from "@/contracts/api";
import { GET as search } from "./search/route";
import { GET as availability } from "./movies/[id]/availability/route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("API routes with the mock data source", () => {
  beforeEach(() => {
    vi.stubEnv("NEXUS_DATA_SOURCE", "mock");
    vi.stubEnv("NEXUS_MOCK_LATENCY_MS", "0");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects queries shorter than 3 characters", async () => {
    const res = await search(new Request("http://x/api/search?q=ab"));
    const body = (await res.json()) as SearchResponse;
    expect(res.status).toBe(400);
    expect(body.ok === false && body.error.code).toBe("invalid_query");
  });

  it("finds movies by original title and reports cached on repeat", async () => {
    const first = (await (await search(new Request("http://x/api/search?q=cinnamon"))).json()) as SearchResponse;
    expect(first.ok && first.data.results.map((m) => m.title)).toEqual(["Kanelbullar och krig"]);
    expect(first.ok && first.cached).toBe(false);
    const again = (await (await search(new Request("http://x/api/search?q=Cinnamon"))).json()) as SearchResponse;
    expect(again.ok && again.cached).toBe(true);
  });

  it("returns an empty list, not an error, when nothing matches", async () => {
    const res = await search(new Request("http://x/api/search?q=zzzzzz"));
    const body = (await res.json()) as SearchResponse;
    expect(res.status).toBe(200);
    expect(body.ok && body.data.results).toEqual([]);
  });

  it("returns grouped availability for a known movie", async () => {
    const res = await availability(new Request("http://x"), params("mock-1"));
    const body = (await res.json()) as AvailabilityResponse;
    expect(body.ok && body.data.groups.map((g) => g.type)).toEqual(["subscription", "rent", "buy"]);
  });

  it("returns 404 not_found for an unknown movie", async () => {
    const res = await availability(new Request("http://x"), params("nope"));
    expect(res.status).toBe(404);
  });

  it("returns 503 provider_unavailable when no data source is configured", async () => {
    vi.stubEnv("NEXUS_DATA_SOURCE", "");
    const res = await search(new Request("http://x/api/search?q=ferry"));
    const body = (await res.json()) as SearchResponse;
    expect(res.status).toBe(503);
    expect(body.ok === false && body.error.code).toBe("provider_unavailable");
  });

  it("never serves mock data on Vercel production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const res = await search(new Request("http://x/api/search?q=ferry"));
    expect(res.status).toBe(503);
  });
});
