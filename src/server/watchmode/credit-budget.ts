import type { KeyValueStore } from "@/server/store";
import type { CreditUsage } from "./types";

const DAY_SECONDS = 24 * 60 * 60;
// Long enough to outlive any month; the key name changes each month anyway.
const MONTH_SECONDS = 32 * DAY_SECONDS;

export interface CreditLimits {
  dailyCap: number;
  monthlyCap: number;
}

export type ReserveResult =
  | { allowed: true; usage: CreditUsage }
  | { allowed: false; usage: CreditUsage; retryAfterSeconds: number };

function dayKey(date: Date): string {
  return `watchmode:credits:day:${date.toISOString().slice(0, 10)}`;
}

function monthKey(date: Date): string {
  return `watchmode:credits:month:${date.toISOString().slice(0, 7)}`;
}

function secondsUntilNextUtcDay(date: Date): number {
  const nextDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return Math.ceil((nextDay - date.getTime()) / 1000);
}

function secondsUntilNextUtcMonth(date: Date): number {
  const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return Math.ceil((nextMonth - date.getTime()) / 1000);
}

/**
 * Counts Watchmode credits per UTC day and month in the shared store and refuses spending past
 * the caps. Credits are reserved before the call is made, so failed calls still count; that errs
 * on the side of spending less.
 */
export function createCreditBudget(store: KeyValueStore, limits: CreditLimits, now: () => Date = () => new Date()) {
  async function readUsage(date: Date): Promise<CreditUsage> {
    const today = await store.get<number>(dayKey(date));
    const thisMonth = await store.get<number>(monthKey(date));

    return {
      today: today ?? 0,
      thisMonth: thisMonth ?? 0,
      dailyCap: limits.dailyCap,
      monthlyCap: limits.monthlyCap,
    };
  }

  async function reserve(credits: number): Promise<ReserveResult> {
    const date = now();
    const today = await store.incrementBy(dayKey(date), credits, DAY_SECONDS);
    const thisMonth = await store.incrementBy(monthKey(date), credits, MONTH_SECONDS);
    const usage = { today, thisMonth, dailyCap: limits.dailyCap, monthlyCap: limits.monthlyCap };

    const overDaily = today > limits.dailyCap;
    const overMonthly = thisMonth > limits.monthlyCap;
    if (!overDaily && !overMonthly) {
      return { allowed: true, usage };
    }

    // Give back what we just reserved: the call will not happen.
    await store.incrementBy(dayKey(date), -credits, DAY_SECONDS);
    await store.incrementBy(monthKey(date), -credits, MONTH_SECONDS);

    let retryAfterSeconds = secondsUntilNextUtcDay(date);
    if (overMonthly) {
      retryAfterSeconds = secondsUntilNextUtcMonth(date);
    }

    const usageBeforeThisCall = {
      ...usage,
      today: today - credits,
      thisMonth: thisMonth - credits,
    };
    return { allowed: false, usage: usageBeforeThisCall, retryAfterSeconds };
  }

  return {
    reserve,
    usage: () => readUsage(now()),
  };
}

export type CreditBudget = ReturnType<typeof createCreditBudget>;
