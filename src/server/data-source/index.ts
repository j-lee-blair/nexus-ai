import { createCache, type Cache } from "@/server/cache";
import { getStore } from "@/server/store";
import { getWatchmodeGateway } from "@/server/watchmode";
import { limitPerVisitor } from "@/server/visitor-limit";
import { createMockDataSource } from "./mock";
import type { DataSource } from "./types";
import { createWatchmodeDataSource } from "./watchmode-source";

export type { DataSource, SourceResult } from "./types";

let mock: DataSource | undefined;
// One cache per server instance, so identical requests in flight share a single provider call.
let cache: Cache | undefined;

function getCache(env: NodeJS.ProcessEnv): Cache {
  if (cache === undefined) {
    cache = createCache(getStore(env));
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
 * - NEXUS_DATA_SOURCE=mock: made-up movies for UI work. Refused on Vercel production so real
 *   users never see invented movies or prices.
 * - Otherwise: Watchmode. Whether that means live calls or recorded fixtures is decided by the
 *   Watchmode gateway's safety switches (ADR 0002), and each visitor's calls are limited per hour.
 */
export function getDataSource(visitorId: string, env: NodeJS.ProcessEnv = process.env): DataSource {
  const wantsMock = env.NEXUS_DATA_SOURCE === "mock";
  const isProduction = env.VERCEL_ENV === "production";

  if (wantsMock && !isProduction) {
    return getMockDataSource(env);
  }

  const gateway = getWatchmodeGateway(env);
  const visitorGateway = limitPerVisitor(gateway, getStore(env), visitorId);
  return createWatchmodeDataSource(visitorGateway, getCache(env));
}
