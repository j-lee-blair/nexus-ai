// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResponse } from "@/contracts/api";
import type { Movie } from "@/domain/types";
import { searchMovies } from "@/ui/api-client";
import { forgetSearch, rememberSearch } from "@/ui/last-search";
import { installBrowserStubs } from "../../../test/browser-stubs";
import { SearchScreen } from "./SearchScreen";

vi.mock("@/ui/api-client", () => ({ searchMovies: vi.fn(), getAvailability: vi.fn() }));
const searchMoviesMock = vi.mocked(searchMovies);

const matrix: Movie = { id: "1", title: "The Matrix", originalTitle: null, year: 1999, tmdbId: null, posterUrl: null };
const showMeLove: Movie = {
  id: "2",
  title: "Show Me Love",
  originalTitle: "Fucking Åmål",
  year: 1998,
  tmdbId: null,
  posterUrl: null,
};

function found(query: string, results: Movie[]): SearchResponse {
  return { ok: true, data: { query, results }, cached: false, checkedAt: "2026-11-02T10:00:00Z" };
}

function typeInSearch(text: string) {
  const input = screen.getByRole("searchbox");
  fireEvent.change(input, { target: { value: text } });
}

function resultLinks() {
  const list = screen.getByRole("list", { name: "Search results" });
  return within(list).getAllByRole("link");
}

describe("SearchScreen", () => {
  beforeEach(() => {
    installBrowserStubs();
    forgetSearch();
    searchMoviesMock.mockReset();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts with a hint and no results", () => {
    render(<SearchScreen initialQuery="" />);

    expect(screen.getByText("Type a movie title, in Swedish or the original language.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Search results" })).toBeNull();
  });

  it("asks for more letters and does not search for a short query", async () => {
    render(<SearchScreen initialQuery="" />);

    typeInSearch("ma");
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(screen.getByText("Type at least 3 letters.")).toBeTruthy();
    expect(searchMoviesMock).not.toHaveBeenCalled();
  });

  it("searches after typing and links each result to its movie, keeping the query", async () => {
    searchMoviesMock.mockResolvedValue(found("matrix", [matrix, showMeLove]));
    render(<SearchScreen initialQuery="" />);

    typeInSearch("matrix");
    await screen.findByText("2 movies found.");

    expect(searchMoviesMock).toHaveBeenCalledTimes(1);
    expect(searchMoviesMock.mock.calls[0][0]).toBe("matrix");
    const links = resultLinks();
    expect(links[0].getAttribute("href")).toBe("/movie/1?q=matrix");
    expect(links[0].textContent).toContain("1999");
    expect(links[1].textContent).toContain("1998 · Fucking Åmål");
  });

  it("puts the query in the address bar", async () => {
    searchMoviesMock.mockResolvedValue(found("matrix", [matrix]));
    render(<SearchScreen initialQuery="" />);

    typeInSearch("matrix");
    await screen.findByText("1 movie found.");

    expect(window.location.search).toBe("?q=matrix");
  });

  it("says so when nothing matches", async () => {
    searchMoviesMock.mockResolvedValue(found("zzzz", []));
    render(<SearchScreen initialQuery="" />);

    typeInSearch("zzzz");

    const message = await screen.findByText("No movies match “zzzz”. Check the spelling or try another title.");
    expect(message).toBeTruthy();
  });

  it("shows the problem and searches again on Try again", async () => {
    searchMoviesMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "provider_unavailable", message: "developer text" },
    });
    searchMoviesMock.mockResolvedValueOnce(found("matrix", [matrix]));
    render(<SearchScreen initialQuery="" />);

    typeInSearch("matrix");
    const retry = await screen.findByRole("button", { name: "Try again" });
    expect(screen.getByText("The search didn't work.")).toBeTruthy();
    fireEvent.click(retry);

    await screen.findByText("1 movie found.");
    expect(searchMoviesMock).toHaveBeenCalledTimes(2);
  });

  it("admits a slow search after a few seconds", async () => {
    vi.useFakeTimers();
    searchMoviesMock.mockReturnValue(new Promise(() => {}));
    render(<SearchScreen initialQuery="" />);

    typeInSearch("matrix");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.getByText("Searching…")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(screen.getByText("Still searching. This is taking longer than usual.")).toBeTruthy();
  });

  it("shows remembered results straight away without asking the server", async () => {
    rememberSearch({ query: "matrix", answeredQuery: "matrix", results: [matrix] });

    render(<SearchScreen initialQuery="matrix" />);
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(screen.getByText("1 movie found.")).toBeTruthy();
    expect(searchMoviesMock).not.toHaveBeenCalled();
  });

  it("beside an answer, marks the open movie and sits in an aside", () => {
    rememberSearch({ query: "matrix", answeredQuery: "matrix", results: [matrix, showMeLove] });

    render(<SearchScreen initialQuery="matrix" selectedMovieId="2" />);

    const links = resultLinks();
    expect(links[0].getAttribute("aria-current")).toBeNull();
    expect(links[1].getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("complementary", { name: "Search" })).toBeTruthy();
  });

  it("beside an answer on a phone, does not spend a lookup on the hidden search", async () => {
    render(<SearchScreen initialQuery="matrix" selectedMovieId="1" />);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(searchMoviesMock).not.toHaveBeenCalled();
  });

  it("remembers the picked movie for the answer screen", async () => {
    rememberSearch({ query: "matrix", answeredQuery: "matrix", results: [matrix] });
    render(<SearchScreen initialQuery="matrix" />);

    const link = resultLinks()[0];
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);

    await waitFor(() => {
      const stored = window.sessionStorage.getItem("nexus:selected-movie:1");
      expect(stored).not.toBeNull();
    });
  });
});
