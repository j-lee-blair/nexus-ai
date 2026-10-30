// Nexus's own domain model. Provider formats (Watchmode, TMDB) are translated into
// these types at the edge and never leak past the server's data-source adapters.

/** ISO 3166-1 alpha-2 country code. The MVP only supports Sweden. */
export type CountryCode = "SE";

export interface Movie {
  /** Nexus movie id. Stable across requests; currently the Watchmode title id as a string. */
  id: string;
  /** Title as Swedish users know it, when the provider has one; otherwise the original title. */
  title: string;
  /** Original-language title, when it differs from `title`. */
  originalTitle: string | null;
  year: number | null;
  /** Used to look up a poster from TMDB (optional enrichment). */
  tmdbId: number | null;
  /** Absolute poster thumbnail URL, or null when there is none. */
  posterUrl: string | null;
}

/** A streaming service, e.g. Netflix or SF Anytime. */
export interface Provider {
  id: string;
  name: string;
}

/** How an offer gives access to the movie. "subscription" is shown as "Included". */
export type OfferType = "subscription" | "free" | "rent" | "buy";

/** Display order of offer groups on the answer screen. */
export const OFFER_TYPE_ORDER: readonly OfferType[] = ["subscription", "free", "rent", "buy"];

export type VideoQuality = "SD" | "HD" | "4K";

export interface Price {
  /** In major units, e.g. 49 for 49 kr. */
  amount: number;
  /** ISO 4217 code, e.g. "SEK". */
  currency: string;
}

/** One way to watch a movie on one service. */
export interface Offer {
  provider: Provider;
  type: OfferType;
  /** Present for rent and buy; null for subscription and free. */
  price: Price | null;
  quality: VideoQuality | null;
  /** Link to the movie on the provider's site, or null when the provider gives none. */
  url: string | null;
}

/**
 * Offers of one type. Rent and buy groups are sorted cheapest first, so `offers[0]` is the
 * cheapest; `cheapest` is true only when there is more than one offer to compare.
 */
export interface OfferGroup {
  type: OfferType;
  offers: Offer[];
  cheapest: boolean;
}

export interface Availability {
  movie: Movie;
  country: CountryCode;
  /** Non-empty groups only, in OFFER_TYPE_ORDER. Empty array = not available in this country. */
  groups: OfferGroup[];
}
