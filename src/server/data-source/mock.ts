import { groupOffers } from "@/domain/group-offers";
import { MOCK_CATALOG } from "./mock-catalog";
import { DataSourceError, type DataSource } from "./types";

/** Lower-cases and strips accents so "Amélie" matches "amelie". */
function normalise(text: string): string {
  const withoutAccents = text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return withoutAccents.toLowerCase().trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * In-memory stand-in for the real data source. The first lookup of a movie waits
 * `latencyMs` and reports `cached: false`; repeats are instant and `cached: true`,
 * so the Discovery reveal and the Ignite snap can both be exercised.
 */
export function createMockDataSource({ latencyMs = 700 } = {}): DataSource {
  const seen = new Map<string, string>(); // key -> checkedAt

  async function lookup<T>(key: string, produce: () => T) {
    const previousCheck = seen.get(key);
    if (previousCheck !== undefined) {
      return { data: produce(), cached: true, checkedAt: previousCheck };
    }

    await sleep(latencyMs);
    const checkedAt = new Date().toISOString();
    seen.set(key, checkedAt);
    return { data: produce(), cached: false, checkedAt };
  }

  return {
    search(query) {
      const normalisedQuery = normalise(query);

      return lookup(`search:${normalisedQuery}`, () => {
        const movies = MOCK_CATALOG.map((entry) => entry.movie);
        return movies.filter((movie) => {
          const searchableText = normalise(`${movie.title} ${movie.originalTitle ?? ""}`);
          return searchableText.includes(normalisedQuery);
        });
      });
    },
    async availability(movieId) {
      const entry = MOCK_CATALOG.find((candidate) => candidate.movie.id === movieId);
      if (!entry) throw new DataSourceError("not_found", "We couldn't find that movie.");
      return lookup(`availability:${movieId}`, () => ({
        movie: entry.movie,
        country: "SE" as const,
        groups: groupOffers(entry.offers),
      }));
    },
  };
}
