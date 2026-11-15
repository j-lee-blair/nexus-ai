// Translates Watchmode's response shapes into Nexus's own types. Nothing outside this file
// (and the Watchmode source that uses it) knows what a Watchmode response looks like.

import { isPaidOfferType, type Movie, type Offer, type OfferType, type VideoQuality } from "@/domain/types";
import { DataSourceError, PROVIDER_UNAVAILABLE_MESSAGE } from "@/server/errors";

/** One entry of `title_results` from GET /search/. */
export interface WatchmodeSearchResult {
  id: number;
  name: string;
  type: string;
  year: number | null;
  tmdb_id: number | null;
}

export interface WatchmodeSearchResponse {
  title_results?: WatchmodeSearchResult[];
}

/** One entry from GET /title/{id}/sources/. */
export interface WatchmodeSource {
  source_id: number;
  name: string;
  /** "sub", "free", "rent", "buy" or "tve" (TV-provider login). */
  type: string;
  region: string;
  web_url: string | null;
  format: string | null;
  price: number | null;
}

/** GET /title/{id}/details/ (only the fields Nexus uses). */
export interface WatchmodeTitleDetails {
  id: number;
  title: string;
  original_title: string | null;
  year: number | null;
  tmdb_id: number | null;
}

export const NEXUS_REGION = "SE";

// The gateway only casts Watchmode's JSON to these types, so the mappers check the fields they
// rely on. A body with another shape is a provider failure: it must never be read (and cached)
// as "no movies" or "not available in Sweden", because that would be a wrong answer.
function unexpectedResponse(what: string): DataSourceError {
  console.error("watchmode.unexpected_response", what);
  return new DataSourceError("provider_unavailable", PROVIDER_UNAVAILABLE_MESSAGE);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSearchResult(value: unknown): value is WatchmodeSearchResult {
  if (!isObject(value)) {
    return false;
  }
  return typeof value.id === "number" && typeof value.name === "string" && typeof value.type === "string";
}

function isSource(value: unknown): value is WatchmodeSource {
  if (!isObject(value)) {
    return false;
  }
  const hasNames = typeof value.name === "string" && typeof value.type === "string";
  const hasIds = typeof value.source_id === "number" && typeof value.region === "string";
  const hasPrice = value.price === null || typeof value.price === "number";
  return hasNames && hasIds && hasPrice;
}

// Watchmode sends prices as plain numbers in the region's own currency, without a currency
// field. The recorded Swedish fixtures show store prices in kronor (e.g. SF Anytime 49).
const REGION_CURRENCY = "SEK";

const OFFER_TYPES: Record<string, OfferType> = {
  sub: "subscription",
  free: "free",
  rent: "rent",
  buy: "buy",
};

const QUALITIES: Record<string, VideoQuality> = {
  SD: "SD",
  HD: "HD",
  "4K": "4K",
};

export function toMovieFromSearch(result: WatchmodeSearchResult): Movie {
  return {
    id: String(result.id),
    title: result.name,
    originalTitle: null,
    year: result.year,
    tmdbId: result.tmdb_id,
    posterUrl: null,
  };
}

export function toMovieFromDetails(details: WatchmodeTitleDetails): Movie {
  if (!isObject(details) || typeof details.id !== "number" || typeof details.title !== "string") {
    throw unexpectedResponse("title details without id or title");
  }

  let originalTitle: string | null = null;
  if (details.original_title && details.original_title !== details.title) {
    originalTitle = details.original_title;
  }

  return {
    id: String(details.id),
    title: details.title,
    originalTitle,
    year: details.year,
    tmdbId: details.tmdb_id,
    posterUrl: null,
  };
}

/** Search results limited to movies (no series, shorts or specials), in Watchmode's order. */
export function toMovies(response: WatchmodeSearchResponse): Movie[] {
  // Watchmode sends an empty list when nothing matches, so a missing list is not "no results".
  if (!isObject(response) || !Array.isArray(response.title_results)) {
    throw unexpectedResponse("search response without title_results");
  }
  const results: unknown[] = response.title_results;
  if (!results.every(isSearchResult)) {
    throw unexpectedResponse("search result with missing fields");
  }

  const movies = results.filter((result) => result.type === "movie");
  return movies.map(toMovieFromSearch);
}

function isWebLink(url: string | null): url is string {
  if (url === null) {
    return false;
  }
  return url.startsWith("https://") || url.startsWith("http://");
}

/**
 * One Watchmode source as a Nexus offer, or null when Nexus doesn't show it: other regions,
 * TV-provider logins ("tve"), and paid offers without a price.
 */
export function toOffer(source: WatchmodeSource): Offer | null {
  if (source.region !== NEXUS_REGION) {
    return null;
  }

  const type = OFFER_TYPES[source.type];
  if (type === undefined) {
    return null;
  }

  const paid = isPaidOfferType(type);
  if (paid && source.price === null) {
    return null;
  }

  let price: Offer["price"] = null;
  if (paid && source.price !== null) {
    price = { amount: source.price, currency: REGION_CURRENCY };
  }

  let quality: VideoQuality | null = null;
  if (source.format !== null && source.format in QUALITIES) {
    quality = QUALITIES[source.format];
  }

  let url: string | null = null;
  if (isWebLink(source.web_url)) {
    url = source.web_url;
  }

  return {
    provider: { id: String(source.source_id), name: source.name },
    type,
    price,
    quality,
    url,
  };
}

export function toOffers(sources: readonly WatchmodeSource[]): Offer[] {
  if (!Array.isArray(sources)) {
    throw unexpectedResponse("sources response is not a list");
  }
  const entries: unknown[] = sources;
  if (!entries.every(isSource)) {
    throw unexpectedResponse("source with missing fields");
  }

  const offers: Offer[] = [];
  for (const source of sources) {
    const offer = toOffer(source);
    if (offer !== null) {
      offers.push(offer);
    }
  }
  return offers;
}
