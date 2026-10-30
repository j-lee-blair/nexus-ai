import { describe, expect, it } from "vitest";
import { createMemoryStore } from "@/server/store";
import { createCreditBudget } from "./credit-budget";

const limits = { dailyCap: 5, monthlyCap: 8 };
const noon = () => new Date("2026-10-30T12:00:00Z");

describe("credit budget", () => {
  it("allows spending up to the daily cap", async () => {
    const budget = createCreditBudget(createMemoryStore(), limits, noon);

    const first = await budget.reserve(2);
    const second = await budget.reserve(3);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect((await budget.usage()).today).toBe(5);
  });

  it("refuses a call that would pass the daily cap and gives the credits back", async () => {
    const budget = createCreditBudget(createMemoryStore(), limits, noon);
    await budget.reserve(4);

    const refused = await budget.reserve(2);

    expect(refused.allowed).toBe(false);
    if (refused.allowed) {
      return;
    }
    expect(refused.retryAfterSeconds).toBe(12 * 60 * 60);

    const usage = await budget.usage();
    expect(usage.today).toBe(4);
    expect(usage.thisMonth).toBe(4);
  });

  it("refuses past the monthly cap until the next month, even on a new day", async () => {
    const store = createMemoryStore();
    let date = new Date("2026-10-30T12:00:00Z");
    const budget = createCreditBudget(store, limits, () => date);

    await budget.reserve(5);
    date = new Date("2026-10-31T12:00:00Z");
    await budget.reserve(3);

    const refused = await budget.reserve(1);

    expect(refused.allowed).toBe(false);
    if (refused.allowed) {
      return;
    }
    expect(refused.retryAfterSeconds).toBe(12 * 60 * 60);
  });
});
