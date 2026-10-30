import { describe, expect, it } from "vitest";
import type { OfferGroup } from "@/domain/types";
import { createCache } from "@/server/cache";
import { createMemoryStore } from "@/server/store";
import { createFixtureGateway } from "@/server/watchmode/fixture-gateway";
import { createWatchmodeDataSource } from "./watchmode-source";

// These tests run against the real Watchmode responses recorded in fixtures/watchmode/.
function createSource() {
  const cache = createCache(createMemoryStore());
  return createWatchmodeDataSource(createFixtureGateway(), cache);
}

function findGroup(groups: OfferGroup[], type: OfferGroup["type"]): OfferGroup {
  const group = groups.find((candidate) => candidate.type === type);
  if (group === undefined) {
    throw new Error(`No ${type} group`);
  }
  return group;
}

describe("Watchmode data source: search (F4)", () => {
  it("returns movies with year and TMDB id, best match first", async () => {
    const source = createSource();

    const result = await source.search("Parasite");
    const first = result.data[0];

    expect(first).toMatchObject({ id: "1295258", title: "Parasite", year: 2019, tmdbId: 496243 });
    expect(result.cached).toBe(false);
  });

  it("leaves out series and other non-movie results", async () => {
    const source = createSource();

    const result = await source.search("Oppenheimer");
    const titlesAndYears = result.data.map((movie) => `${movie.title} ${movie.year}`);

    expect(titlesAndYears).toContain("Oppenheimer 2023");
    expect(titlesAndYears).not.toContain("Oppenheimer 1980");
  });

  it("finds a movie by its Swedish title", async () => {
    const source = createSource();

    const result = await source.search("Män som hatar kvinnor");

    expect(result.data[0]).toMatchObject({ id: "1393987", year: 2009 });
  });

  it("returns an empty list when nothing matches", async () => {
    const source = createSource();

    const result = await source.search("qzxv no such movie");

    expect(result.data).toEqual([]);
  });

  it("answers a repeated search from the cache, ignoring case", async () => {
    const source = createSource();
    await source.search("Parasite");

    const repeat = await source.search("parasite");

    expect(repeat.cached).toBe(true);
  });
});

describe("Watchmode data source: availability (F5)", () => {
  it("groups Swedish offers with prices in SEK, cheapest first", async () => {
    const source = createSource();
    await source.search("Parasite");

    const result = await source.availability("1295258");
    const rent = findGroup(result.data.groups, "rent");
    const cheapest = rent.offers[0];

    expect(result.data.movie.title).toBe("Parasite");
    expect(result.data.country).toBe("SE");
    expect(cheapest.provider.name).toBe("AppleTV");
    expect(cheapest.price).toEqual({ amount: 19, currency: "SEK" });
    expect(cheapest.url).toMatch(/^https:\/\/tv\.apple\.com\/se\//);
    expect(rent.cheapest).toBe(true);
  });

  it("keeps one offer per service in each group", async () => {
    const source = createSource();
    await source.search("Parasite");

    const result = await source.availability("1295258");
    const rentProviders = findGroup(result.data.groups, "rent").offers.map((offer) => offer.provider.name);

    expect(rentProviders).toEqual(["AppleTV", "SF Anytime"]);
  });

  it("puts Included first, then Free, with no prices on either", async () => {
    const source = createSource();
    await source.search("Triangle of Sadness");

    const result = await source.availability("1568066");
    const groupTypes = result.data.groups.map((group) => group.type);
    const included = findGroup(result.data.groups, "subscription");
    const free = findGroup(result.data.groups, "free");

    expect(groupTypes.slice(0, 2)).toEqual(["subscription", "free"]);
    expect(included.offers[0].price).toBeNull();
    expect(free.offers[0].provider.name).toBe("Cineasterna (Library Card)");
  });

  it("returns no groups for a movie that isn't available in Sweden", async () => {
    const source = createSource();
    await source.search("En man som heter Ove");

    const result = await source.availability("1925888");

    expect(result.data.groups).toEqual([]);
  });

  it("answers a repeated lookup from the cache", async () => {
    const source = createSource();
    await source.search("Parasite");
    await source.availability("1295258");

    const repeat = await source.availability("1295258");

    expect(repeat.cached).toBe(true);
  });

  it("fails as provider_unavailable when there is no recorded answer", async () => {
    const source = createSource();

    const lookup = source.availability("999999999");

    await expect(lookup).rejects.toMatchObject({ code: "provider_unavailable" });
  });
});
