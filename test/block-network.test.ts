import { describe, expect, it } from "vitest";

describe("test environment", () => {
  it("blocks real network access", async () => {
    const attempt = fetch("https://api.watchmode.com/v1/search/");

    await expect(attempt).rejects.toThrow("Network access is blocked in tests");
  });
});
