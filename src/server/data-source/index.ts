import { createMockDataSource } from "./mock";
import { DataSourceError, type DataSource } from "./types";

export { DataSourceError } from "./types";
export type { DataSource, SourceResult } from "./types";

/** Used until the Watchmode source exists (F1–F5): every lookup fails cleanly. */
const notConnected: DataSource = {
  async search() {
    throw new DataSourceError("provider_unavailable", "Movie data isn't connected yet.");
  },
  async availability() {
    throw new DataSourceError("provider_unavailable", "Movie data isn't connected yet.");
  },
};

let mock: DataSource | undefined;

/**
 * Picks the data source from NEXUS_DATA_SOURCE.
 * - "mock": made-up data for development. Refused on Vercel production so real users
 *   never see invented movies or prices.
 * - anything else: not connected yet.
 */
export function getDataSource(env: NodeJS.ProcessEnv = process.env): DataSource {
  const wantsMock = env.NEXUS_DATA_SOURCE === "mock";
  const isProduction = env.VERCEL_ENV === "production";

  if (!wantsMock || isProduction) {
    return notConnected;
  }

  if (mock === undefined) {
    const latencyMs = Number(env.NEXUS_MOCK_LATENCY_MS ?? 700);
    mock = createMockDataSource({ latencyMs });
  }
  return mock;
}
