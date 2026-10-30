import { describe, expect, it } from "vitest";
import type { ErrorCode } from "@/contracts/api";
import { describeProblem, formatWait } from "./problems";

describe("describeProblem", () => {
  const codes: ErrorCode[] = ["invalid_query", "not_found", "rate_limited", "quota_reached", "provider_unavailable"];

  it("has a title and an explanation for every error code", () => {
    for (const code of codes) {
      const problem = describeProblem(code);

      expect(problem.title.length).toBeGreaterThan(0);
      expect(problem.detail.length).toBeGreaterThan(0);
    }
  });

  it("only offers Try again when trying again straight away can help", () => {
    expect(describeProblem("provider_unavailable").canRetry).toBe(true);
    expect(describeProblem("rate_limited").canRetry).toBe(false);
    expect(describeProblem("quota_reached").canRetry).toBe(false);
    expect(describeProblem("not_found").canRetry).toBe(false);
  });

  it("says how long to wait when the server tells us", () => {
    const rateLimited = describeProblem("rate_limited", 300);
    const quotaReached = describeProblem("quota_reached", 7200);

    expect(rateLimited.detail).toContain("Try again in about 5 minutes.");
    expect(quotaReached.detail).toContain("Try again in about 2 hours.");
  });
});

describe("formatWait", () => {
  it("rounds up to minutes and hours", () => {
    expect(formatWait(20)).toBe("under a minute");
    expect(formatWait(60)).toBe("about a minute");
    expect(formatWait(61)).toBe("about 2 minutes");
    expect(formatWait(3600)).toBe("about an hour");
    expect(formatWait(3601)).toBe("about 2 hours");
  });
});
