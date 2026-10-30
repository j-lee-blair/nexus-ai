import { OFFER_TYPE_ORDER, type Offer, type OfferGroup, type OfferType } from "./types";

const QUALITY_RANK = { "4K": 3, HD: 2, SD: 1 } as const;
const PAID: ReadonlySet<OfferType> = new Set(["rent", "buy"]);

function qualityRank(offer: Offer): number {
  return offer.quality ? QUALITY_RANK[offer.quality] : 0;
}

/** True when `a` should replace `b` as a provider's single offer of one type. */
function isBetter(a: Offer, b: Offer): boolean {
  const pa = a.price?.amount ?? Infinity;
  const pb = b.price?.amount ?? Infinity;
  if (PAID.has(a.type) && pa !== pb) return pa < pb;
  return qualityRank(a) > qualityRank(b);
}

/**
 * Turns a flat list of offers into the groups shown on the answer screen:
 * - one offer per provider per type (cheapest; ties broken by better quality),
 * - rent and buy sorted cheapest first, other groups by provider name,
 * - groups in OFFER_TYPE_ORDER, empty groups left out.
 */
export function groupOffers(offers: readonly Offer[]): OfferGroup[] {
  const best = new Map<string, Offer>();
  for (const offer of offers) {
    const key = `${offer.type}:${offer.provider.id}`;
    const current = best.get(key);
    if (!current || isBetter(offer, current)) best.set(key, offer);
  }

  return OFFER_TYPE_ORDER.flatMap((type) => {
    const list = [...best.values()].filter((o) => o.type === type);
    if (list.length === 0) return [];
    const paid = PAID.has(type);
    list.sort((a, b) =>
      paid
        ? (a.price?.amount ?? Infinity) - (b.price?.amount ?? Infinity) ||
          a.provider.name.localeCompare(b.provider.name, "sv")
        : a.provider.name.localeCompare(b.provider.name, "sv"),
    );
    return [{ type, offers: list, cheapest: paid && list.length > 1 }];
  });
}
