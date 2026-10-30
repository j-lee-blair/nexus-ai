// Turns answer data into the words and numbers shown on screen.
// Pure functions only, so they are easy to test and reuse in the Converge reveal (F8).

import type { Offer, OfferGroup, OfferType, Price } from "@/domain/types";

const GROUP_LABELS: Record<OfferType, string> = {
  subscription: "Included with subscription",
  free: "Free",
  rent: "Rent",
  buy: "Buy",
};

export function groupLabel(type: OfferType): string {
  return GROUP_LABELS[type];
}

/** "49 kr" for SEK. Whole amounts drop the decimals; others keep two. */
export function formatPrice(price: Price): string {
  const isWholeAmount = Number.isInteger(price.amount);

  let fractionDigits = 2;
  if (isWholeAmount) {
    fractionDigits = 0;
  }

  const formatter = new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: price.currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return formatter.format(price.amount);
}

/** What the right-hand side of an offer row says. */
export function offerPriceLabel(offer: Offer): string {
  if (offer.price !== null) {
    return formatPrice(offer.price);
  }
  if (offer.type === "free") {
    return "Free";
  }
  return "Included";
}

/** Number of different services that offer the movie in any way. */
export function countServices(groups: OfferGroup[]): number {
  const providerIds = new Set<string>();
  for (const group of groups) {
    for (const offer of group.offers) {
      providerIds.add(offer.provider.id);
    }
  }
  return providerIds.size;
}

/** The one-line answer above the groups, also announced to screen readers. */
export function availabilitySummary(groups: OfferGroup[]): string {
  const serviceCount = countServices(groups);

  if (serviceCount === 0) {
    return "Not streaming in Sweden";
  }
  if (serviceCount === 1) {
    return "On 1 service in Sweden";
  }
  return `On ${serviceCount} services in Sweden`;
}

/**
 * Width of an offer's price bar as a percentage of the most expensive offer in its group.
 * Compares this movie's own offers only; it says nothing about the wider market.
 */
export function priceBarPercent(offer: Offer, group: OfferGroup): number {
  if (offer.price === null) {
    return 0;
  }

  let highestAmount = 0;
  for (const other of group.offers) {
    if (other.price !== null && other.price.amount > highestAmount) {
      highestAmount = other.price.amount;
    }
  }

  if (highestAmount === 0) {
    return 0;
  }
  return Math.round((offer.price.amount / highestAmount) * 100);
}

/**
 * Whether an offer gets the Cheapest tag. Several offers can share the lowest price, and they
 * all get the tag. When every offer costs the same, nothing is cheaper, so none gets it.
 */
export function isCheapestOffer(offer: Offer, group: OfferGroup): boolean {
  if (!group.cheapest || offer.price === null) {
    return false;
  }

  const lowestOffer = group.offers[0];
  const highestOffer = group.offers[group.offers.length - 1];
  if (lowestOffer.price === null || highestOffer.price === null) {
    return false;
  }

  const allSamePrice = lowestOffer.price.amount === highestOffer.price.amount;
  if (allSamePrice) {
    return false;
  }
  return offer.price.amount === lowestOffer.price.amount;
}

/** "Checked just now", "Checked 5 min ago", "Checked 3 h ago", "Checked 2 days ago". */
export function formatCheckedAt(checkedAt: string, now: Date): string {
  const checkedTime = new Date(checkedAt).getTime();
  const elapsedMinutes = Math.floor((now.getTime() - checkedTime) / 60_000);

  if (Number.isNaN(elapsedMinutes) || elapsedMinutes < 1) {
    return "Checked just now";
  }
  if (elapsedMinutes < 60) {
    return `Checked ${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `Checked ${elapsedHours} h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) {
    return "Checked 1 day ago";
  }
  return `Checked ${elapsedDays} days ago`;
}

/** Up to two initials, used on placeholder posters and service chips. */
export function initials(name: string): string {
  const fillerWords = new Set(["of", "the", "och", "and", "a", "en", "ett"]);
  // Only words that start with a letter or digit, so "Jönssonligan & Wall Enberg" gives "JW".
  const words = name.split(/\s+/).filter((word) => /^[\p{L}\p{N}]/u.test(word));
  const meaningfulWords = words.filter((word) => !fillerWords.has(word.toLowerCase()));

  let chosenWords = meaningfulWords;
  if (chosenWords.length === 0) {
    chosenWords = words;
  }

  const letters = chosenWords.slice(0, 2).map((word) => word.charAt(0));
  return letters.join("").toUpperCase();
}

/** A stable decorative hue (0–359) for a name, so each service keeps its colour. */
export function hueFor(name: string): number {
  let hue = 7;
  for (const character of name) {
    hue = (hue * 31 + character.charCodeAt(0)) % 360;
  }
  return hue;
}
