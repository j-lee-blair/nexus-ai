import { describe, expect, it } from "vitest";
import { moviePagePath, searchPagePath } from "./page-routes";

describe("searchPagePath", () => {
  it("links to the plain search page when there is no query", () => {
    expect(searchPagePath("")).toBe("/");
  });

  it("puts the query in the address, safely encoded", () => {
    expect(searchPagePath("Fucking Åmål")).toBe("/?q=Fucking%20%C3%85m%C3%A5l");
  });
});

describe("moviePagePath", () => {
  it("links to the movie and keeps the query", () => {
    expect(moviePagePath("1295258", "parasite")).toBe("/movie/1295258?q=parasite");
  });

  it("encodes the movie id and the query", () => {
    expect(moviePagePath("a/b", "x&y")).toBe("/movie/a%2Fb?q=x%26y");
  });
});
