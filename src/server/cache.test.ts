import { describe, expect, it, vi } from "vitest";
import { createCache } from "./cache";
import { createMemoryStore } from "./store";

describe("cache", () => {
  it("loads once and then answers from the cache", async () => {
    const cache = createCache(createMemoryStore());
    const load = vi.fn(async () => "answer");

    const first = await cache.remember("key", 60, load);
    const second = await cache.remember("key", 60, load);

    expect(first).toMatchObject({ value: "answer", cached: false });
    expect(second).toMatchObject({ value: "answer", cached: true, storedAt: first.storedAt });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("shares one load between identical requests that arrive together", async () => {
    const cache = createCache(createMemoryStore());
    const load = vi.fn(async () => "answer");

    const [first, second] = await Promise.all([
      cache.remember("key", 60, load),
      cache.remember("key", 60, load),
    ]);

    expect(load).toHaveBeenCalledTimes(1);
    expect(first.value).toBe("answer");
    expect(second.value).toBe("answer");
  });

  it("loads again after the entry expires", async () => {
    let now = 0;
    const cache = createCache(createMemoryStore(() => now));
    const load = vi.fn(async () => "answer");

    await cache.remember("key", 60, load);
    now = 61_000;
    const later = await cache.remember("key", 60, load);

    expect(later.cached).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not store a failed load", async () => {
    const cache = createCache(createMemoryStore());
    const failing = vi.fn(async () => {
      throw new Error("provider down");
    });

    await expect(cache.remember("key", 60, failing)).rejects.toThrow("provider down");

    const retry = await cache.remember("key", 60, async () => "answer");
    expect(retry.cached).toBe(false);
  });
});
