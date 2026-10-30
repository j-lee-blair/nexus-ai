import { groupOffers } from "@/domain/group-offers";
import type { Availability, Movie } from "@/domain/types";
import { AVAILABILITY_TTL_SECONDS, SEARCH_TTL_SECONDS, type Cache } from "@/server/cache";
import type { WatchmodeGateway, WatchmodeRequest } from "@/server/watchmode";
import type { DataSource } from "./types";
import {
  NEXUS_REGION,
  toMovieFromDetails,
  toMovies,
  toOffers,
  type WatchmodeSearchResponse,
  type WatchmodeSource,
  type WatchmodeTitleDetails,
} from "./watchmode-mappers";

// Movies seen in search results are remembered as long as searches, so opening a result never
// needs an extra details call.
const MOVIE_TTL_SECONDS = SEARCH_TTL_SECONDS;

function searchRequest(query: string): WatchmodeRequest {
  return { path: "/search/", params: { search_field: "name", search_value: query }, credits: 1 };
}

function sourcesRequest(movieId: string): WatchmodeRequest {
  return { path: `/title/${movieId}/sources/`, params: { regions: NEXUS_REGION }, credits: 1 };
}

function detailsRequest(movieId: string): WatchmodeRequest {
  return { path: `/title/${movieId}/details/`, params: {}, credits: 1 };
}

function normaliseQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Answers searches and availability from Watchmode (live or fixtures, decided by the gateway),
 * through the cache. Costs per new movie: 1 credit per new search, 1 per availability lookup.
 */
export function createWatchmodeDataSource(gateway: WatchmodeGateway, cache: Cache): DataSource {
  async function rememberMovies(movies: Movie[]) {
    for (const movie of movies) {
      await cache.remember(`movie:v1:${movie.id}`, MOVIE_TTL_SECONDS, async () => movie);
    }
  }

  async function findMovie(movieId: string): Promise<Movie> {
    const remembered = await cache.remember(`movie:v1:${movieId}`, MOVIE_TTL_SECONDS, async () => {
      const details = await gateway.request<WatchmodeTitleDetails>(detailsRequest(movieId));
      return toMovieFromDetails(details);
    });
    return remembered.value;
  }

  return {
    async search(query) {
      const key = `search:v1:${normaliseQuery(query)}`;

      const remembered = await cache.remember(key, SEARCH_TTL_SECONDS, async () => {
        const response = await gateway.request<WatchmodeSearchResponse>(searchRequest(query.trim()));
        return toMovies(response);
      });

      if (!remembered.cached) {
        await rememberMovies(remembered.value);
      }
      return { data: remembered.value, cached: remembered.cached, checkedAt: remembered.storedAt };
    },

    async availability(movieId) {
      const key = `availability:v1:${movieId}`;

      const remembered = await cache.remember(key, AVAILABILITY_TTL_SECONDS, async () => {
        const movie = await findMovie(movieId);
        const sources = await gateway.request<WatchmodeSource[]>(sourcesRequest(movieId));
        const availability: Availability = {
          movie,
          country: NEXUS_REGION,
          groups: groupOffers(toOffers(sources)),
        };
        return availability;
      });

      return { data: remembered.value, cached: remembered.cached, checkedAt: remembered.storedAt };
    },
  };
}
