import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { forgetSearch, rememberSearch } from "@/ui/last-search";
import { SearchScreen } from "./SearchScreen";
import { SplitLayout } from "./SplitLayout";

const matrix = { id: "1", title: "The Matrix", originalTitle: null, year: 1999, tmdbId: null, posterUrl: null };
const reloaded = { id: "2", title: "The Matrix Reloaded", originalTitle: null, year: 2003, tmdbId: null, posterUrl: null };

describe("SplitLayout", () => {
  it("asks the visitor to pick a movie while no answer is open", () => {
    const html = renderToStaticMarkup(<SplitLayout search={<p>search</p>} answer={null} />);

    expect(html).toContain("<p>search</p>");
    expect(html).toContain("Pick a movie to see where it streams in Sweden.");
  });

  it("shows search and answer together once a movie is open", () => {
    const html = renderToStaticMarkup(<SplitLayout search={<p>search</p>} answer={<p>answer</p>} />);

    expect(html).toContain("<p>search</p>");
    expect(html).toContain("<p>answer</p>");
    expect(html).not.toContain("Pick a movie");
  });
});

describe("SearchScreen beside an answer", () => {
  afterEach(() => {
    forgetSearch();
  });

  it("shows the remembered results straight away and highlights the open movie", () => {
    rememberSearch({ query: "matrix", answeredQuery: "matrix", results: [matrix, reloaded] });

    const html = renderToStaticMarkup(<SearchScreen initialQuery="matrix" selectedMovieId="2" />);

    expect(html).toContain('<aside class="');
    expect(html).toContain("The Matrix Reloaded");
    expect(html).toContain('aria-current="page" href="/movie/2?q=matrix"');
    expect(html).not.toContain('aria-current="page" href="/movie/1?q=matrix"');
  });

  it("is the page's main content when no movie is open", () => {
    const html = renderToStaticMarkup(<SearchScreen initialQuery="" />);

    expect(html).toContain("<main");
    expect(html).not.toContain("<aside");
  });
});
