import { describe, expect, it } from "vitest";
import type { Offer, OfferGroup } from "@/domain/types";
import {
  availabilitySummary,
  formatCheckedAt,
  formatPrice,
  initials,
  isCheapestOffer,
  offerPriceLabel,
  priceBarPercent,
} from "./format";

function offer(providerId: string, type: Offer["type"], amount: number | null): Offer {
  let price = null;
  if (amount !== null) {
    price = { amount, currency: "SEK" };
  }
  return {
    provider: { id: providerId, name: providerId },
    type,
    price,
    quality: null,
    url: null,
  };
}

describe("formatPrice", () => {
  it("shows whole kronor without decimals", () => {
    const text = formatPrice({ amount: 49, currency: "SEK" });

    expect(text.replace(/\s/g, " ")).toBe("49 kr");
  });

  it("keeps öre when the price has them", () => {
    const text = formatPrice({ amount: 39.5, currency: "SEK" });

    expect(text.replace(/\s/g, " ")).toBe("39,50 kr");
  });
});

describe("offerPriceLabel", () => {
  it("says Included for subscriptions and Free for free offers", () => {
    const included = offerPriceLabel(offer("netflix", "subscription", null));
    const free = offerPriceLabel(offer("svt", "free", null));

    expect(included).toBe("Included");
    expect(free).toBe("Free");
  });
});

describe("availabilitySummary", () => {
  it("counts each service once across groups", () => {
    const groups: OfferGroup[] = [
      { type: "rent", offers: [offer("apple", "rent", 39), offer("sf", "rent", 49)], cheapest: true },
      { type: "buy", offers: [offer("apple", "buy", 129)], cheapest: false },
    ];

    const summary = availabilitySummary(groups);

    expect(summary).toBe("On 2 services in Sweden");
  });

  it("says clearly when the movie is not available", () => {
    const summary = availabilitySummary([]);

    expect(summary).toBe("Not streaming in Sweden");
  });
});

describe("priceBarPercent", () => {
  it("scales against the most expensive offer in the same group", () => {
    const cheap = offer("apple", "rent", 25);
    const expensive = offer("sf", "rent", 50);
    const group: OfferGroup = { type: "rent", offers: [cheap, expensive], cheapest: true };

    expect(priceBarPercent(cheap, group)).toBe(50);
    expect(priceBarPercent(expensive, group)).toBe(100);
  });
});

describe("formatCheckedAt", () => {
  const now = new Date("2026-10-30T12:00:00Z");

  it("uses minutes, hours and days", () => {
    expect(formatCheckedAt("2026-10-30T11:59:40Z", now)).toBe("Checked just now");
    expect(formatCheckedAt("2026-10-30T11:55:00Z", now)).toBe("Checked 5 min ago");
    expect(formatCheckedAt("2026-10-30T09:00:00Z", now)).toBe("Checked 3 h ago");
    expect(formatCheckedAt("2026-10-28T12:00:00Z", now)).toBe("Checked 2 days ago");
  });
});

describe("initials", () => {
  it("skips filler words", () => {
    expect(initials("The Girl with the Dragon Tattoo")).toBe("GW");
    expect(initials("SF Anytime")).toBe("SA");
    expect(initials("The")).toBe("T");
    expect(initials("Jönssonligan & Wall Enberg")).toBe("JW");
  });
});

describe("isCheapestOffer", () => {
  it("tags every offer that shares the lowest price", () => {
    const apple = offer("apple", "rent", 39);
    const amazon = offer("amazon", "rent", 39);
    const sf = offer("sf", "rent", 49);
    const group: OfferGroup = { type: "rent", offers: [apple, amazon, sf], cheapest: true };

    expect(isCheapestOffer(apple, group)).toBe(true);
    expect(isCheapestOffer(amazon, group)).toBe(true);
    expect(isCheapestOffer(sf, group)).toBe(false);
  });

  it("tags nothing when every offer costs the same", () => {
    const apple = offer("apple", "buy", 99);
    const amazon = offer("amazon", "buy", 99);
    const group: OfferGroup = { type: "buy", offers: [apple, amazon], cheapest: true };

    expect(isCheapestOffer(apple, group)).toBe(false);
  });
});
