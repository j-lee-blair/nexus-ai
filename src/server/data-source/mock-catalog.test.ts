import { describe, expect, it } from "vitest";
import { OFFER_TYPE_ORDER } from "@/domain/types";
import { mockMovieById, mockSearch, toSearchKey } from "./mock-catalog";

describe("Faker mock catalog", () => {
  it("gives the same movies for the same search", () => {
    const first = mockSearch("matrix");
    const second = mockSearch("matrix");

    expect(second).toEqual(first);
  });

  it("gives different movies for different searches", () => {
    const matrix = mockSearch("matrix");
    const amelie = mockSearch("amelie");

    expect(matrix[0].movie.title).toBe("The Matrix");
    expect(amelie[0].movie.title).toBe("The Amelie");
  });

  it("treats case, accents and punctuation as the same search", () => {
    expect(toSearchKey("Amélie!")).toBe("amelie");
    expect(toSearchKey("  The MATRIX ")).toBe("the-matrix");
  });

  it("finds a movie again from its id alone", () => {
    const entries = mockSearch("the matrix");
    const last = entries[entries.length - 1];

    const found = mockMovieById(last.movie.id);

    expect(found).toEqual(last);
  });

  it("returns null for ids no search produces", () => {
    expect(mockMovieById("nope")).toBeNull();
    expect(mockMovieById("matrix--99")).toBeNull();
  });

  it("only uses known offer types and prices for rent and buy", () => {
    const entries = mockSearch("lighthouse");

    for (const entry of entries) {
      for (const offer of entry.offers) {
        expect(OFFER_TYPE_ORDER).toContain(offer.type);
        const isPaid = offer.type === "rent" || offer.type === "buy";
        expect(offer.price !== null).toBe(isPaid);
      }
    }
  });
});
