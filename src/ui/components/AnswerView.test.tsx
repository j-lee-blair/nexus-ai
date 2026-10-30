import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Availability, Offer } from "@/domain/types";
import { AnswerView } from "./AnswerView";

const movie = {
  id: "1",
  title: "Test Movie",
  originalTitle: null,
  year: 2020,
  tmdbId: null,
  posterUrl: null,
};

function rentOffer(name: string, amount: number, url: string | null): Offer {
  return {
    provider: { id: name.toLowerCase(), name },
    type: "rent",
    price: { amount, currency: "SEK" },
    quality: "HD",
    url,
  };
}

function render(availability: Availability): string {
  const checkedAt = "2026-10-30T11:55:00Z";
  const now = new Date("2026-10-30T12:00:00Z");
  const html = renderToStaticMarkup(<AnswerView availability={availability} checkedAt={checkedAt} now={now} />);
  return html;
}

describe("AnswerView", () => {
  it("shows groups in order with prices, a Cheapest tag and links that open safely", () => {
    const availability: Availability = {
      movie,
      country: "SE",
      groups: [
        {
          type: "subscription",
          offers: [
            {
              provider: { id: "netflix", name: "Netflix" },
              type: "subscription",
              price: null,
              quality: null,
              url: "https://www.netflix.com/title/1",
            },
          ],
          cheapest: false,
        },
        {
          type: "rent",
          offers: [rentOffer("Apple TV", 39, "https://tv.apple.com/1"), rentOffer("SF Anytime", 49, null)],
          cheapest: true,
        },
      ],
    };

    const html = render(availability);

    const includedPosition = html.indexOf("Included with subscription");
    const rentPosition = html.indexOf(">Rent<");
    expect(includedPosition).toBeGreaterThan(-1);
    expect(rentPosition).toBeGreaterThan(includedPosition);
    expect(html).toContain("On 3 services in Sweden");
    expect(html.match(/Cheapest/g)).toHaveLength(1);
    expect(html).toMatch(/39\s+kr/);
    expect(html).toContain('href="https://tv.apple.com/1" target="_blank" rel="noopener noreferrer"');
    expect(html).toContain("Checked 5 min ago");
    expect(html).toContain("Watchmode");
  });

  it("says clearly when the movie is not available in Sweden", () => {
    const availability: Availability = { movie, country: "SE", groups: [] };

    const html = render(availability);

    expect(html).toContain("Not streaming in Sweden");
    expect(html).toContain("You can’t stream, rent or buy this movie in Sweden right now.");
  });
});
