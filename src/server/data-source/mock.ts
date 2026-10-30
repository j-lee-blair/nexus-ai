import { groupOffers } from "@/domain/group-offers";
import { MOCK_CATALOG } from "./mock-catalog";
import { DataSourceError, type DataSource } from "./types";

const normalise = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * In-memory stand-in for the real data source. The first lookup of a movie waits
 * `latencyMs` and reports `cached: false`; repeats are instant and `cached: true`,
 * so the Discovery reveal and the Ignite snap can both be exercised.
 */
export function createMockDataSource({ latencyMs = 700 } = {}): DataSource {
  const seen = new Map<string, string>(); // key -> checkedAt

  async function lookup<T>(key: string, produce: () => T) {
    const checkedAt = seen.get(key);
    if (checkedAt) return { data: produce(), cached: true, checkedAt };
    await sleep(latencyMs);
    const now = new Date().toISOString();
    const data = produce();
    seen.set(key, now);
    return { data, cached: false, checkedAt: now };
  }

  return {
    search(query) {
      const q = normalise(query);
      return lookup(`search:${q}`, () =>
        MOCK_CATALOG.map((e) => e.movie).filter((m) =>
          normalise(`${m.title} ${m.originalTitle ?? ""}`).includes(q),
        ),
      );
    },
    async availability(movieId) {
      const entry = MOCK_CATALOG.find((e) => e.movie.id === movieId);
      if (!entry) throw new DataSourceError("not_found", "We couldn't find that movie.");
      return lookup(`availability:${movieId}`, () => ({
        movie: entry.movie,
        country: "SE" as const,
        groups: groupOffers(entry.offers),
      }));
    },
  };
}
