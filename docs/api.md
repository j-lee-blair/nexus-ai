# Nexus API contract (F0)

The browser talks to the Nexus server through these two endpoints only. Types live in
`src/contracts/api.ts` and `src/domain/types.ts`; this page shows what they look like on the wire.

Every response is either a success envelope:

```json
{ "ok": true, "data": { … }, "cached": false, "checkedAt": "2026-10-30T10:10:25.342Z" }
```

`cached: true` means the answer came from Nexus's cache, so the UI plays the Ignite snap instead of
the Discovery reveal. `checkedAt` is when the data was fetched from the provider.

or an error envelope:

```json
{ "ok": false, "error": { "code": "quota_reached", "message": "…", "retryAfterSeconds": 3600 } }
```

| Code | HTTP | Meaning |
|---|---|---|
| `invalid_query` | 400 | Query missing or shorter than 3 characters |
| `not_found` | 404 | Unknown movie id |
| `rate_limited` | 429 | This visitor made too many fresh lookups |
| `quota_reached` | 503 | Nexus's daily or monthly provider budget is used up |
| `provider_unavailable` | 503 | The data provider failed, timed out, or isn't connected |

No search results is **not** an error: it is a success with `results: []`.

## `GET /api/search?q=<title>`

```json
{
  "ok": true,
  "data": {
    "query": "ferry",
    "results": [
      { "id": "mock-1", "title": "Midnight Ferry", "originalTitle": null, "year": 2019, "tmdbId": null, "posterUrl": null },
      { "id": "mock-2", "title": "Midnight Ferry", "originalTitle": null, "year": 1987, "tmdbId": null, "posterUrl": null }
    ]
  },
  "cached": false,
  "checkedAt": "2026-10-30T10:10:25.342Z"
}
```

## `GET /api/movies/:id/availability`

Offers are grouped in the order Included (`subscription`), `free`, `rent`, `buy`; empty groups are
left out, and an empty `groups` array means "not available in Sweden". Rent and buy are sorted
cheapest first; `cheapest: true` means `offers[0]` should be marked as the cheapest.

```json
{
  "ok": true,
  "data": {
    "movie": { "id": "mock-4", "title": "Kanelbullar och krig", "originalTitle": "Cinnamon and War", "year": 2021, "tmdbId": null, "posterUrl": null },
    "country": "SE",
    "groups": [
      { "type": "free", "cheapest": false, "offers": [
        { "provider": { "id": "svtplay", "name": "SVT Play" }, "type": "free", "price": null, "quality": "HD", "url": "https://example.com/mock/svtplay" }
      ] },
      { "type": "rent", "cheapest": false, "offers": [
        { "provider": { "id": "sfanytime", "name": "SF Anytime" }, "type": "rent", "price": { "amount": 39, "currency": "SEK" }, "quality": "HD", "url": "https://example.com/mock/sfanytime" }
      ] }
    ]
  },
  "cached": false,
  "checkedAt": "2026-10-30T10:10:25.342Z"
}
```

These examples come from the mock data source: made-up movies for development, never served in
production.
