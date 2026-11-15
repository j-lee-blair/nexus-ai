import { createCache, type Cache } from "@/server/cache";
import { getStore } from "@/server/store";
import { getWatchmodeGateway, isLiveWatchmode } from "@/server/watchmode";
import { limitPerVisitor } from "@/server/visitor-limit";
import { createMockDataSource } from "./mock";
import type { DataSource } from "./types";
import { createWatchmodeDataSource } from "./watchmode-source";

export type { DataSource, SourceResult } from "./types";

let mock: DataSource | undefined;
// One cache per server instance (and per kind of data), so identical requests in flight share a
// single provider call.
const caches = new Map<string, Cache>();

/**
 * Live and recorded answers are cached under different key prefixes. Previews and production
 * share one Redis, so without this a recorded answer cached by a preview would be served on the
 * public site as if it were current.
 */
function getCache(env: NodeJS.ProcessEnv): Cache {
  let keyPrefix = "recorded:";
  if (isLiveWatchmode(env)) {
    keyPrefix = "live:";
  }

  let cache = caches.get(keyPrefix);
  if (cache === undefined) {
    cache = createCache(getStore(env), () => new Date(), keyPrefix);
    caches.set(keyPrefix, cache);
  }
  return cache;
}

function getMockDataSource(env: NodeJS.ProcessEnv): DataSource {
  if (mock === undefined) {
    const latencyMs = Number(env.NEXUS_MOCK_LATENCY_MS ?? 700);
    mock = createMockDataSource({ latencyMs });
  }
  return mock;
}

/**
 * Picks the data source for one visitor's request.
 * - NEXUS_DATA_SOURCE=mock: made-up movies for UI work. Only in development and tests (never in
 *   a production build, including Vercel previews), so nobody sees invented movies or prices.
 * - Otherwise: Watchmode. Whether that means live calls or recorded fixtures is decided by the
 *   Watchmode gateway's safety switches (ADR 0002), and each visitor's calls are limited per hour.
 */
export function getDataSource(visitorId: string, env: NodeJS.ProcessEnv = process.env): DataSource {
  const wantsMock = env.NEXUS_DATA_SOURCE === "mock";
  const isProductionBuild = env.NODE_ENV === "production";

  if (wantsMock && !isProductionBuild) {
    return getMockDataSource(env);
  }

  const gateway = getWatchmodeGateway(env);
  const visitorGateway = limitPerVisitor(gateway, getStore(env), visitorId);
  return createWatchmodeDataSource(visitorGateway, getCache(env));
}
