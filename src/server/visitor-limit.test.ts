import { describe, expect, it, vi } from "vitest";
import { createMemoryStore } from "@/server/store";
import type { WatchmodeGateway, WatchmodeRequest } from "@/server/watchmode";
import { VISITOR_LOOKUPS_PER_HOUR, limitPerVisitor, visitorIdFrom } from "./visitor-limit";

const search: WatchmodeRequest = { path: "/search/", params: {}, credits: 1 };

// 12:45:00 UTC, so the next hour starts in 15 minutes.
const quarterToOne = () => new Date("2026-11-15T12:45:00Z");

function fakeGateway() {
  const request = vi.fn(async () => ({ title_results: [] }));
  const gateway = { request } as unknown as WatchmodeGateway;
  return { gateway, request };
}

async function makeLookups(gateway: WatchmodeGateway, count: number) {
  for (let lookup = 0; lookup < count; lookup++) {
    await gateway.request(search);
  }
}

describe("visitor limit (F10)", () => {
  it("lets a visitor make the allowed number of Watchmode calls in an hour", async () => {
    const { gateway, request } = fakeGateway();
    const limited = limitPerVisitor(gateway, createMemoryStore(), "visitor-a", quarterToOne);

    await makeLookups(limited, VISITOR_LOOKUPS_PER_HOUR);

    expect(request).toHaveBeenCalledTimes(VISITOR_LOOKUPS_PER_HOUR);
  });

  it("refuses the next call with rate_limited until the next hour, without calling Watchmode", async () => {
    const { gateway, request } = fakeGateway();
    const limited = limitPerVisitor(gateway, createMemoryStore(), "visitor-a", quarterToOne);
    await makeLookups(limited, VISITOR_LOOKUPS_PER_HOUR);

    const oneTooMany = limited.request(search);

    await expect(oneTooMany).rejects.toMatchObject({ code: "rate_limited", retryAfterSeconds: 15 * 60 });
    expect(request).toHaveBeenCalledTimes(VISITOR_LOOKUPS_PER_HOUR);
  });

  it("counts each visitor separately", async () => {
    const { gateway, request } = fakeGateway();
    const store = createMemoryStore();
    const visitorA = limitPerVisitor(gateway, store, "visitor-a", quarterToOne);
    const visitorB = limitPerVisitor(gateway, store, "visitor-b", quarterToOne);
    await makeLookups(visitorA, VISITOR_LOOKUPS_PER_HOUR);

    await visitorB.request(search);

    expect(request).toHaveBeenCalledTimes(VISITOR_LOOKUPS_PER_HOUR + 1);
  });

  it("identifies a visitor by the first forwarded address, without keeping the address", () => {
    const request = new Request("http://localhost/api/search", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    const sameVisitor = new Request("http://localhost/api/search", {
      headers: { "x-forwarded-for": "203.0.113.7" },
    });

    const visitorId = visitorIdFrom(request);

    expect(visitorId).toBe(visitorIdFrom(sameVisitor));
    expect(visitorId).not.toContain("203.0.113.7");
  });
});
