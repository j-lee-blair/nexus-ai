import { getStore } from "@/server/store";
import { createCreditBudget } from "./credit-budget";
import { createFixtureGateway } from "./fixture-gateway";
import { createLiveGateway } from "./live-gateway";
import { createUnavailableGateway } from "./unavailable-gateway";
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
 * Recorded answers are months old, so visitors must never see them as current availability.
 * They are allowed in development and tests, and on Vercel previews, which only people signed
 * in to the project's Vercel account can open.
 */
export function canUseRecordedAnswers(env: NodeJS.ProcessEnv): boolean {
  const isProductionBuild = env.NODE_ENV === "production";
  const isVercelPreview = env.VERCEL_ENV === "preview";
  return !isProductionBuild || isVercelPreview;
}

/**
 * Live Watchmode only when every safety switch allows it (ADR 0002):
 * - WATCHMODE_LIVE_CALLS must be "on" (off by default),
 * - WATCHMODE_KILL_SWITCH must not be "on",
 * - WATCHMODE_API_KEY must be set.
 * Otherwise no credits are spent: the recorded fixtures answer where that is allowed, and
 * everywhere else (the public site) every lookup is "provider unavailable".
 */
export function isLiveWatchmode(env: NodeJS.ProcessEnv): boolean {
  const liveCallsOn = env.WATCHMODE_LIVE_CALLS === "on";
  const killSwitchOn = env.WATCHMODE_KILL_SWITCH === "on";
  const hasApiKey = Boolean(env.WATCHMODE_API_KEY);
  return liveCallsOn && !killSwitchOn && hasApiKey;
}

export function getWatchmodeGateway(env: NodeJS.ProcessEnv = process.env): WatchmodeGateway {
  const apiKey = env.WATCHMODE_API_KEY;

  if (!isLiveWatchmode(env) || !apiKey) {
    if (canUseRecordedAnswers(env)) {
      return createFixtureGateway();
    }
    return createUnavailableGateway();
  }

  return createLiveGateway({
    apiKey,
    budget: getCreditBudget(env),
    fetchImpl: fetch,
  });
}
