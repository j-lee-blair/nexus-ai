# ADR 0001: Watchmode as the availability data provider

- Status: Accepted
- Date: 2026-10-30

## Context

Nexus needs movie search and Swedish streaming availability: subscription, rent, buy and free
offers, prices, and links to the movie on each service. We compared Watchmode with the Streaming
Availability API (Movie of the Night, also sold through RapidAPI).

| | Watchmode | Streaming Availability |
|---|---|---|
| Free plan | 2,500 credits/month, non-commercial, attribution required, up to 3 countries | Free plan exists; current quota not published |
| Credits per new movie | ~2 (search 1 + sources 1) | 1 (title search includes availability) |
| Offer data | type (sub/rent/buy/free/tve), price, format SD/HD/4K, web link | same, plus expiry dates, audio/subtitles, add-ons |
| Countries | 54 (paid) | 65 |
| Sweden | Yes | Yes |

## Decision

Use **Watchmode** on its free Developer plan. The maintainer rates its data highest, and its terms
and quota are clearly published.

Watchmode is a source, not the domain model. Its responses are translated into Nexus's own
`Movie → Availability → Provider → Offer` types in one adapter, so a provider switch means
rewriting that adapter only.

## Consequences

- Credit Watchmode on every screen that shows its data, with a link to watchmode.com (free plan).
- Cached Watchmode data must be refreshed or deleted within 30 days (free plan).
- App deep links are paid-only. Still to verify with one live call: whether the free plan returns
  web links to the movie, and whether Swedish prices come back in SEK.
- Usage limits are handled by [ADR 0002](0002-api-credit-safeguards.md).
- Watchmode images are not licensed for our use, so posters come from TMDB
  ([ADR 0003](0003-posters-from-tmdb.md)).
