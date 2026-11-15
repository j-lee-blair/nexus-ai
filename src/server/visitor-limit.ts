import { createHash } from "node:crypto";
import { DataSourceError } from "@/server/errors";
import type { KeyValueStore } from "@/server/store";
import type { WatchmodeGateway, WatchmodeRequest } from "@/server/watchmode";

/** ADR 0002: about 20 fresh lookups per visitor per hour. Each Watchmode call counts as one. */
export const VISITOR_LOOKUPS_PER_HOUR = 20;

const HOUR_SECONDS = 60 * 60;

/**
 * A visitor is their IP address, which Vercel puts first in x-forwarded-for. It is hashed so the
 * store never holds an IP address. Without the header (local development) everyone shares one
 * visitor.
 */
export function visitorIdFrom(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  let address = "unknown";
  if (forwardedFor !== null) {
    const firstAddress = forwardedFor.split(",")[0];
    address = firstAddress.trim();
  }

  const hash = createHash("sha256");
  hash.update(address);
  return hash.digest("hex").slice(0, 32);
}

function hourKey(visitorId: string, date: Date): string {
  const hour = date.toISOString().slice(0, 13);
  return `visitor:lookups:${visitorId}:${hour}`;
}

function secondsUntilNextUtcHour(date: Date): number {
  const nextHour = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours() + 1,
  );
  return Math.ceil((nextHour - date.getTime()) / 1000);
}

/**
 * Wraps the Watchmode gateway so one visitor can make only a limited number of calls per UTC
 * hour. Cached answers never reach the gateway, so they are never limited. This stops one visitor
 * from using up the daily credit cap that every visitor shares.
 */
export function limitPerVisitor(
  gateway: WatchmodeGateway,
  store: KeyValueStore,
  visitorId: string,
  now: () => Date = () => new Date(),
): WatchmodeGateway {
  return {
    async request<T>(watchmodeRequest: WatchmodeRequest): Promise<T> {
      const date = now();
      const key = hourKey(visitorId, date);
      const lookupsThisHour = await store.incrementBy(key, 1, HOUR_SECONDS);

      if (lookupsThisHour > VISITOR_LOOKUPS_PER_HOUR) {
        throw new DataSourceError(
          "rate_limited",
          "This visitor made too many fresh lookups this hour.",
          secondsUntilNextUtcHour(date),
        );
      }

      return gateway.request<T>(watchmodeRequest);
    },
  };
}
