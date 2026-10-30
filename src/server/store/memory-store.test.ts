import { describe, expect, it } from "vitest";
import { createMemoryStore } from "./memory-store";

describe("memory store", () => {
  it("returns stored values until they expire", async () => {
    let now = 0;
    const store = createMemoryStore(() => now);

    await store.set("key", { answer: 42 }, 10);
    expect(await store.get("key")).toEqual({ answer: 42 });

    now = 10_000;
    expect(await store.get("key")).toBeNull();
  });

  it("increments from zero and keeps the first expiry", async () => {
    let now = 0;
    const store = createMemoryStore(() => now);

    expect(await store.incrementBy("count", 2, 10)).toBe(2);

    now = 5_000;
    expect(await store.incrementBy("count", 3, 10)).toBe(5);

    now = 10_000;
    expect(await store.get("count")).toBeNull();
  });
});
