import { OFFER_TYPE_ORDER, type Offer, type OfferGroup, type OfferType } from "./types";

const QUALITY_RANK = { "4K": 3, HD: 2, SD: 1 } as const;

function isPaid(type: OfferType): boolean {
  return type === "rent" || type === "buy";
}

function priceOf(offer: Offer): number {
  if (offer.price === null) {
    return Infinity;
  }
  return offer.price.amount;
}

function qualityRank(offer: Offer): number {
  if (offer.quality === null) {
    return 0;
  }
  return QUALITY_RANK[offer.quality];
}

/** True when `candidate` should replace `current` as a provider's single offer of one type. */
function isBetterOffer(candidate: Offer, current: Offer): boolean {
  if (isPaid(candidate.type) && priceOf(candidate) !== priceOf(current)) {
    return priceOf(candidate) < priceOf(current);
  }
  return qualityRank(candidate) > qualityRank(current);
}

function byProviderName(a: Offer, b: Offer): number {
  return a.provider.name.localeCompare(b.provider.name, "sv");
}

function byPriceThenProviderName(a: Offer, b: Offer): number {
  const priceDifference = priceOf(a) - priceOf(b);
  if (priceDifference !== 0) {
    return priceDifference;
  }
  return byProviderName(a, b);
}

/** Keeps one offer per provider per type: the cheapest, with ties broken by better quality. */
function bestOfferPerProvider(offers: readonly Offer[]): Offer[] {
  const bestByKey = new Map<string, Offer>();

  for (const offer of offers) {
    const key = `${offer.type}:${offer.provider.id}`;
    const current = bestByKey.get(key);

    if (current === undefined || isBetterOffer(offer, current)) {
      bestByKey.set(key, offer);
    }
  }

  return [...bestByKey.values()];
}

/**
 * Turns a flat list of offers into the groups shown on the answer screen:
 * - one offer per provider per type,
 * - rent and buy sorted cheapest first, other groups by provider name,
 * - groups in OFFER_TYPE_ORDER, empty groups left out.
 */
export function groupOffers(offers: readonly Offer[]): OfferGroup[] {
  const uniqueOffers = bestOfferPerProvider(offers);
  const groups: OfferGroup[] = [];

  for (const type of OFFER_TYPE_ORDER) {
    const offersOfType = uniqueOffers.filter((offer) => offer.type === type);
    if (offersOfType.length === 0) {
      continue;
    }

    const paid = isPaid(type);
    if (paid) {
      offersOfType.sort(byPriceThenProviderName);
    } else {
      offersOfType.sort(byProviderName);
    }

    groups.push({
      type,
      offers: offersOfType,
      cheapest: paid && offersOfType.length > 1,
    });
  }

  return groups;
}
