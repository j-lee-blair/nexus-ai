// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailabilityResponse } from "@/contracts/api";
import type { Availability, Movie } from "@/domain/types";
import { getAvailability } from "@/ui/api-client";
import { installBrowserStubs } from "../../../test/browser-stubs";
import { AnswerScreen } from "./AnswerScreen";

vi.mock("@/ui/api-client", () => ({ searchMovies: vi.fn(), getAvailability: vi.fn() }));
const getAvailabilityMock = vi.mocked(getAvailability);

const matrix: Movie = { id: "1", title: "The Matrix", originalTitle: null, year: 1999, tmdbId: null, posterUrl: null };

const availability: Availability = {
  movie: matrix,
  country: "SE",
  groups: [
    {
      type: "rent",
      cheapest: true,
      offers: [
        {
          provider: { id: "sf", name: "SF Anytime" },
          type: "rent",
          price: { amount: 39, currency: "SEK" },
          quality: "HD",
          url: "https://example.com/sf",
        },
        {
          provider: { id: "apple", name: "Apple TV" },
          type: "rent",
          price: { amount: 49, currency: "SEK" },
          quality: "4K",
          url: null,
        },
      ],
    },
  ],
};

function answer(cached: boolean): AvailabilityResponse {
  return { ok: true, data: availability, cached, checkedAt: new Date().toISOString() };
}

function failure(code: "provider_unavailable" | "not_found"): AvailabilityResponse {
  return { ok: false, error: { code, message: "developer text" } };
}

function answerRegion(): HTMLElement {
  const region = document.querySelector<HTMLElement>("[aria-busy]");
  if (region === null) {
    throw new Error("No answer region");
  }
  return region;
}

const ANNOUNCEMENT = "The Matrix: On 2 services in Sweden.";

describe("AnswerScreen", () => {
  beforeEach(() => {
    installBrowserStubs();
    getAvailabilityMock.mockReset();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows a busy loading state first", () => {
    getAvailabilityMock.mockReturnValue(new Promise(() => {}));

    render(<AnswerScreen movieId="1" query="matrix" />);

    expect(screen.getByText("Finding where to stream…")).toBeTruthy();
    expect(answerRegion().getAttribute("aria-busy")).toBe("true");
  });

  it("shows the movie picked in search while the answer loads", () => {
    window.sessionStorage.setItem("nexus:selected-movie:1", JSON.stringify(matrix));
    getAvailabilityMock.mockReturnValue(new Promise(() => {}));

    render(<AnswerScreen movieId="1" query="matrix" />);

    expect(screen.getByRole("heading", { level: 1, name: "The Matrix" })).toBeTruthy();
  });

  it("reveals a fresh answer, then announces it and stops being busy", async () => {
    getAvailabilityMock.mockResolvedValue(answer(false));

    render(<AnswerScreen movieId="1" query="matrix" />);

    const announcement = await screen.findByText(ANNOUNCEMENT);
    expect(announcement).toBeTruthy();
    expect(answerRegion().getAttribute("aria-busy")).toBe("false");
    expect(screen.getByRole("heading", { level: 1, name: "The Matrix" })).toBeTruthy();
    expect(screen.getByText("On 2 services in Sweden")).toBeTruthy();
  });

  it("links offers to their service and marks the cheapest", async () => {
    getAvailabilityMock.mockResolvedValue(answer(false));

    render(<AnswerScreen movieId="1" query="matrix" />);
    await screen.findByText(ANNOUNCEMENT);

    const sfLink = screen.getByRole("link", { name: /SF Anytime/ });
    expect(sfLink.getAttribute("href")).toBe("https://example.com/sf");
    expect(sfLink.textContent).toContain("Cheapest");
    expect(screen.queryByRole("link", { name: /Apple TV/ })).toBeNull();
  });

  it("lets a tap skip the reveal of a cached answer", async () => {
    getAvailabilityMock.mockResolvedValue(answer(true));

    render(<AnswerScreen movieId="1" query="matrix" />);
    await screen.findByText("On 2 services in Sweden");
    fireEvent.pointerDown(window);

    const announcement = await screen.findByText(ANNOUNCEMENT);
    expect(announcement).toBeTruthy();
    expect(answerRegion().getAttribute("aria-busy")).toBe("false");
  });

  it("uses a short fade when the visitor prefers reduced motion", async () => {
    installBrowserStubs({ reducedMotion: true });
    getAvailabilityMock.mockResolvedValue(answer(false));

    render(<AnswerScreen movieId="1" query="matrix" />);

    const announcement = await screen.findByText(ANNOUNCEMENT);
    expect(announcement).toBeTruthy();
  });

  it("shows the problem and loads again on Try again", async () => {
    getAvailabilityMock.mockResolvedValueOnce(failure("provider_unavailable"));
    getAvailabilityMock.mockResolvedValueOnce(answer(false));

    render(<AnswerScreen movieId="1" query="matrix" />);
    const retry = await screen.findByRole("button", { name: "Try again" });
    fireEvent.click(retry);

    const announcement = await screen.findByText(ANNOUNCEMENT);
    expect(announcement).toBeTruthy();
    expect(getAvailabilityMock).toHaveBeenCalledTimes(2);
  });

  it("goes back to the results when there was a search", () => {
    getAvailabilityMock.mockReturnValue(new Promise(() => {}));

    render(<AnswerScreen movieId="1" query="matrix" />);

    const back = screen.getByRole("link", { name: "← Back to results" });
    expect(back.getAttribute("href")).toBe("/?q=matrix");
  });

  it("offers a new search when opened without a search", () => {
    getAvailabilityMock.mockReturnValue(new Promise(() => {}));

    render(<AnswerScreen movieId="1" query="" />);

    const back = screen.getByRole("link", { name: "← New search" });
    expect(back.getAttribute("href")).toBe("/");
  });

  it("for an unknown movie, offers to search again for the picked title", async () => {
    window.sessionStorage.setItem("nexus:selected-movie:1", JSON.stringify(matrix));
    getAvailabilityMock.mockResolvedValue(failure("not_found"));

    render(<AnswerScreen movieId="1" query="" />);

    const searchAgain = await screen.findByRole("link", { name: "Search again" });
    expect(searchAgain.getAttribute("href")).toBe("/?q=The%20Matrix");
  });

  it("admits a slow answer after a few seconds", async () => {
    vi.useFakeTimers();
    getAvailabilityMock.mockReturnValue(new Promise(() => {}));

    render(<AnswerScreen movieId="1" query="matrix" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(screen.getByText("Still looking. The data provider is slower than usual.")).toBeTruthy();
  });
});
