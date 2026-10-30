import { getStore } from "@/server/store";
import { createCreditBudget } from "./credit-budget";
import { createFixtureGateway } from "./fixture-gateway";
import { createLiveGateway } from "./live-gateway";
import type { WatchmodeGateway } from "./types";

export type { WatchmodeGateway, WatchmodeRequest, CreditUsage } from "./types";

const DEFAULT_DAILY_CAP = 60;
const DEFAULT_MONTHLY_CAP = 2000;

function readCap(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

export function getCreditBudget(env: NodeJS.ProcessEnv = process.env) {
  const limits = {
    dailyCap: readCap(env.WATCHMODE_DAILY_CREDIT_CAP, DEFAULT_DAILY_CAP),
    monthlyCap: readCap(env.WATCHMODE_MONTHLY_CREDIT_CAP, DEFAULT_MONTHLY_CAP),
  };
  return createCreditBudget(getStore(env), limits);
}

/**
 * Live Watchmode only when every safety switch allows it (ADR 0002):
 * - WATCHMODE_LIVE_CALLS must be "on" (off by default),
 * - WATCHMODE_KILL_SWITCH must not be "on",
 * - WATCHMODE_API_KEY must be set.
 * Otherwise the recorded fixtures answer, and no credits are spent.
 */
export function getWatchmodeGateway(env: NodeJS.ProcessEnv = process.env): WatchmodeGateway {
  const liveCallsOn = env.WATCHMODE_LIVE_CALLS === "on";
  const killSwitchOn = env.WATCHMODE_KILL_SWITCH === "on";
  const apiKey = env.WATCHMODE_API_KEY;

  if (!liveCallsOn || killSwitchOn || !apiKey) {
    return createFixtureGateway();
  }

  return createLiveGateway({
    apiKey,
    budget: getCreditBudget(env),
    fetchImpl: fetch,
  });
}
