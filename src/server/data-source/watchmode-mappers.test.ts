import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataSourceError } from "@/server/errors";
import {
  toMovieFromDetails,
  toMovies,
  toOffer,
  toOffers,
  type WatchmodeSearchResponse,
  type WatchmodeSource,
  type WatchmodeTitleDetails,
} from "./watchmode-mappers";

const base: WatchmodeSource = {
  source_id: 349,
  name: "AppleTV",
  type: "rent",
  region: "SE",
  web_url: "https://tv.apple.com/se/movie/x",
  format: "HD",
  price: 39,
};

describe("toOffer", () => {
  it("maps a Swedish rental", () => {
    const offer = toOffer(base);

    expect(offer).toEqual({
      provider: { id: "349", name: "AppleTV" },
      type: "rent",
      price: { amount: 39, currency: "SEK" },
      quality: "HD",
      url: "https://tv.apple.com/se/movie/x",
    });
  });

  it("maps sub to subscription without a price", () => {
    const offer = toOffer({ ...base, type: "sub", price: null });

    expect(offer?.type).toBe("subscription");
    expect(offer?.price).toBeNull();
  });

  it("skips other regions, TV-provider logins and paid offers without a price", () => {
    expect(toOffer({ ...base, region: "NO" })).toBeNull();
    expect(toOffer({ ...base, type: "tve" })).toBeNull();
    expect(toOffer({ ...base, price: null })).toBeNull();
  });

  it("drops links that aren't web links, such as paid-plan placeholders", () => {
    const offer = toOffer({ ...base, web_url: "Deeplinks available for paid plans only." });

    expect(offer?.url).toBeNull();
  });
});

describe("unexpected Watchmode responses", () => {
  // Silences the error log these cases write on purpose.
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("treats a search body without title_results as a provider failure, not as no results", () => {
    const body = {} as WatchmodeSearchResponse;

    expect(() => toMovies(body)).toThrow(DataSourceError);
  });

  it("treats a search result without a name as a provider failure", () => {
    const body = { title_results: [{ id: 1, type: "movie" }] } as unknown as WatchmodeSearchResponse;

    expect(() => toMovies(body)).toThrow(DataSourceError);
  });

  it("treats a sources body that isn't a list as a provider failure", () => {
    const body = { message: "nope" } as unknown as WatchmodeSource[];

    expect(() => toOffers(body)).toThrow(DataSourceError);
  });

  it("treats a source with a price that isn't a number as a provider failure", () => {
    const body = [{ ...base, price: "39" }] as unknown as WatchmodeSource[];

    expect(() => toOffers(body)).toThrow(DataSourceError);
  });

  it("treats title details without a title as a provider failure", () => {
    const body = { id: 1 } as unknown as WatchmodeTitleDetails;

    expect(() => toMovieFromDetails(body)).toThrow(DataSourceError);
  });
});
