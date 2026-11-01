import { beforeEach, describe, expect, it } from "vitest";
import { forgetSearch, recallSearch, rememberSearch } from "./last-search";

const matrix = { id: "1", title: "The Matrix", originalTitle: null, year: 1999, tmdbId: null, posterUrl: null };

describe("last search", () => {
  beforeEach(() => {
    forgetSearch();
  });

  it("recalls the results for the same query, ignoring surrounding spaces", () => {
    rememberSearch({ query: "matrix", answeredQuery: "matrix", results: [matrix] });

    const recalled = recallSearch("  matrix ");

    expect(recalled?.results).toEqual([matrix]);
  });

  it("recalls nothing for a different query", () => {
    rememberSearch({ query: "matrix", answeredQuery: "matrix", results: [matrix] });

    const recalled = recallSearch("matri");

    expect(recalled).toBeNull();
  });

  it("recalls nothing before any search", () => {
    const recalled = recallSearch("matrix");

    expect(recalled).toBeNull();
  });
});
