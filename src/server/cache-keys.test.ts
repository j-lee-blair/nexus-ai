import { describe, expect, it } from "vitest";
import { availabilityCacheKey, movieCacheKey, searchCacheKey } from "./cache-keys";

describe("cache keys", () => {
  it("gives the same search key regardless of case and surrounding spaces", () => {
    const typed = searchCacheKey("  The Matrix ");
    const lowercase = searchCacheKey("the matrix");

    expect(typed).toBe(lowercase);
  });

  it("keeps the key format used before the keys moved here, so cached values stay valid", () => {
    expect(searchCacheKey("Parasite")).toBe("search:v1:parasite");
    expect(movieCacheKey("1295258")).toBe("movie:v1:1295258");
    expect(availabilityCacheKey("1295258")).toBe("availability:v1:1295258");
  });
});
