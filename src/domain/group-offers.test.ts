import { describe, expect, it } from "vitest";
import { groupOffers } from "./group-offers";
import type { Offer, OfferType } from "./types";

const offer = (provider: string, type: OfferType, sek?: number, quality: Offer["quality"] = "HD"): Offer => ({
  provider: { id: provider, name: provider },
  type,
  price: sek === undefined ? null : { amount: sek, currency: "SEK" },
  quality,
  url: null,
});

describe("groupOffers", () => {
  it("orders groups Included, Free, Rent, Buy and drops empty ones", () => {
    const groups = groupOffers([offer("B", "buy", 99), offer("N", "subscription"), offer("R", "rent", 39)]);
    expect(groups.map((g) => g.type)).toEqual(["subscription", "rent", "buy"]);
  });

  it("sorts rent and buy cheapest first and flags cheapest when there is a choice", () => {
    const [rent] = groupOffers([offer("A", "rent", 49), offer("B", "rent", 29), offer("C", "rent", 39)]);
    expect(rent.offers.map((o) => o.price?.amount)).toEqual([29, 39, 49]);
    expect(rent.cheapest).toBe(true);
  });

  it("does not flag a cheapest offer when there is only one", () => {
    const [buy] = groupOffers([offer("A", "buy", 99)]);
    expect(buy.cheapest).toBe(false);
  });

  it("keeps one offer per provider and type: the cheapest, then the better quality", () => {
    const [rent, buy] = groupOffers([
      offer("A", "rent", 39, "HD"),
      offer("A", "rent", 29, "SD"),
      offer("A", "buy", 129, "HD"),
      offer("A", "buy", 129, "4K"),
    ]);
    expect(rent.offers).toHaveLength(1);
    expect(rent.offers[0].price?.amount).toBe(29);
    expect(buy.offers[0].quality).toBe("4K");
  });

  it("returns no groups when nothing is available", () => {
    expect(groupOffers([])).toEqual([]);
  });
});
