// Translates Watchmode's response shapes into Nexus's own types. Nothing outside this file
// (and the Watchmode source that uses it) knows what a Watchmode response looks like.

import type { Movie, Offer, OfferType, VideoQuality } from "@/domain/types";

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
  const results = response.title_results ?? [];
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

  const paid = type === "rent" || type === "buy";
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
  const offers: Offer[] = [];
  for (const source of sources) {
    const offer = toOffer(source);
    if (offer !== null) {
      offers.push(offer);
    }
  }
  return offers;
}
