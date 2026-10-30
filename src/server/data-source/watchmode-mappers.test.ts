import { describe, expect, it } from "vitest";
import { toOffer, type WatchmodeSource } from "./watchmode-mappers";

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
