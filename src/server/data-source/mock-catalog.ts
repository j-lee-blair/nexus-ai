// Made-up movies for development only, generated with Faker. Never served in production
// (see ./index.ts): the titles, services and prices are nonsense and must not reach real users.
//
// Everything is seeded from the search text, so the same search always gives the same movies,
// services and prices. A movie's id carries the search it came from, so its availability can
// be generated again from the id alone.

import { en, Faker } from "@faker-js/faker";
import type { Movie, Offer, OfferType, Provider, VideoQuality } from "@/domain/types";

export interface MockEntry {
  movie: Movie;
  offers: Offer[];
}

/** Searches that trigger a specific case instead of generated movies. */
export const MOCK_TRIGGERS = {
  /** Returns no results. */
  noResults: "404",
  /** Fails like a server bug would. */
  serverError: "500",
} as const;

const SERVICE_COUNT = 8;
const MAX_RESULTS = 8;
const OFFER_TYPES: OfferType[] = ["subscription", "free", "rent", "buy"];
const QUALITIES: VideoQuality[] = ["SD", "HD", "4K"];
// A short list of price points, so ties (several services at the same price) happen often.
const RENT_PRICES = [29, 39, 49, 59];
const BUY_PRICES = [99, 119, 149, 199];

/** Turns text into a whole number, so it can seed Faker. */
function seedFrom(text: string): number {
  let seed = 7;
  for (const character of text) {
    seed = (seed * 31 + character.charCodeAt(0)) % 2_147_483_647;
  }
  return seed;
}

function seededFaker(text: string): Faker {
  const faker = new Faker({ locale: [en] });
  faker.seed(seedFrom(text));
  return faker;
}

/** "The Matrix!" → "the-matrix". Used in movie ids, so it must be URL-safe. */
export function toSearchKey(query: string): string {
  const withoutAccents = query.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const lowercase = withoutAccents.toLowerCase();
  const dashed = lowercase.replace(/[^a-z0-9]+/g, "-");
  return dashed.replace(/^-+|-+$/g, "");
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** The same nonsense streaming services every time, so they recur across movies. */
function mockServices(): Provider[] {
  const faker = seededFaker("services");
  const services: Provider[] = [];
  for (let index = 0; index < SERVICE_COUNT; index++) {
    const name = faker.company.name();
    services.push({ id: `mock-service-${index}`, name });
  }
  return services;
}

const SERVICES = mockServices();

function mockOffers(faker: Faker): Offer[] {
  // About one movie in six is not available anywhere, so that answer gets exercised too.
  const isUnavailable = faker.number.int({ min: 1, max: 6 }) === 1;
  if (isUnavailable) {
    return [];
  }

  const offerCount = faker.number.int({ min: 1, max: 10 });
  const offers: Offer[] = [];
  for (let index = 0; index < offerCount; index++) {
    const provider = faker.helpers.arrayElement(SERVICES);
    const type = faker.helpers.arrayElement(OFFER_TYPES);

    let price = null;
    if (type === "rent") {
      price = { amount: faker.helpers.arrayElement(RENT_PRICES), currency: "SEK" };
    }
    if (type === "buy") {
      price = { amount: faker.helpers.arrayElement(BUY_PRICES), currency: "SEK" };
    }

    // Some offers have no link, as happens with real data.
    let url: string | null = `https://example.com/mock/${provider.id}`;
    const hasNoLink = faker.number.int({ min: 1, max: 8 }) === 1;
    if (hasNoLink) {
      url = null;
    }

    offers.push({
      provider,
      type,
      price,
      quality: faker.helpers.arrayElement(QUALITIES),
      url,
    });
  }
  return offers;
}

function mockMovie(faker: Faker, searchKey: string, index: number): Movie {
  const searchWords = searchKey.split("-").map(capitalise).join(" ");
  const extraWord = capitalise(faker.word.noun());

  let title = `${searchWords} ${extraWord}`;
  if (index === 0) {
    title = `The ${searchWords}`;
  }

  // Now and then a movie has a different original title, like Swedish films often do.
  let originalTitle: string | null = null;
  const hasOriginalTitle = faker.number.int({ min: 1, max: 4 }) === 1;
  if (hasOriginalTitle) {
    originalTitle = `${capitalise(faker.word.adjective())} ${capitalise(faker.word.noun())}`;
  }

  return {
    id: `${searchKey}--${index}`,
    title,
    originalTitle,
    year: faker.number.int({ min: 1950, max: 2026 }),
    tmdbId: null,
    posterUrl: null,
  };
}

/** Generated movies (with their offers) for a search. Same search, same answer. */
export function mockSearch(query: string): MockEntry[] {
  const searchKey = toSearchKey(query);
  if (searchKey === "") {
    return [];
  }

  const faker = seededFaker(searchKey);
  const resultCount = faker.number.int({ min: 1, max: MAX_RESULTS });

  const entries: MockEntry[] = [];
  for (let index = 0; index < resultCount; index++) {
    const movie = mockMovie(faker, searchKey, index);
    const offers = mockOffers(faker);
    entries.push({ movie, offers });
  }
  return entries;
}

/** The generated movie for an id such as "matrix--2", or null if no search produces it. */
export function mockMovieById(movieId: string): MockEntry | null {
  const separatorPosition = movieId.lastIndexOf("--");
  if (separatorPosition === -1) {
    return null;
  }

  const searchKey = movieId.slice(0, separatorPosition);
  const entries = mockSearch(searchKey);
  const entry = entries.find((candidate) => candidate.movie.id === movieId);
  if (entry === undefined) {
    return null;
  }
  return entry;
}
