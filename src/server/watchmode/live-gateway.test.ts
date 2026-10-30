import { describe, expect, it, vi } from "vitest";
import { DataSourceError } from "@/server/data-source/types";
import { createMemoryStore } from "@/server/store";
import { createCreditBudget } from "./credit-budget";
import { createLiveGateway } from "./live-gateway";
import type { WatchmodeRequest } from "./types";

const search: WatchmodeRequest = {
  path: "/search/",
  params: { search_field: "name", search_value: "parasite" },
  credits: 1,
};

function setUp(fetchImpl: typeof fetch, dailyCap = 60) {
  const budget = createCreditBudget(createMemoryStore(), { dailyCap, monthlyCap: 2000 });
  const log = vi.fn();
  const gateway = createLiveGateway({ apiKey: "secret-key", budget, fetchImpl, log });
  return { gateway, budget, log };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("live Watchmode gateway", () => {
  it("calls Watchmode with the key and returns the JSON body", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ title_results: [] }));
    const { gateway } = setUp(fetchImpl);

    const body = await gateway.request(search);

    expect(body).toEqual({ title_results: [] });
    const calledUrl = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(calledUrl.pathname).toBe("/v1/search/");
    expect(calledUrl.searchParams.get("search_value")).toBe("parasite");
    expect(calledUrl.searchParams.get("apiKey")).toBe("secret-key");
  });

  it("never writes the API key to the log", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({}));
    const { gateway, log } = setUp(fetchImpl);

    await gateway.request(search);

    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain("secret-key");
  });

  it("refuses with quota_reached and makes no call once the cap is used up", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({}));
    const { gateway } = setUp(fetchImpl, 1);
    await gateway.request(search);

    const secondCall = gateway.request(search);

    await expect(secondCall).rejects.toMatchObject({ code: "quota_reached" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reports provider_unavailable when Watchmode answers with an error", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ message: "nope" }, 500));
    const { gateway } = setUp(fetchImpl);

    const call = gateway.request(search);

    await expect(call).rejects.toBeInstanceOf(DataSourceError);
    await expect(call).rejects.toMatchObject({ code: "provider_unavailable" });
  });

  it("reports provider_unavailable when the request fails", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError("network down");
    });
    const { gateway } = setUp(fetchImpl);

    const call = gateway.request(search);

    await expect(call).rejects.toMatchObject({ code: "provider_unavailable" });
  });
});
