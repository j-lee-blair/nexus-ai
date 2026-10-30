# Nexus MVP: feature breakdown

Each feature below can be built, tested and changed on its own. They stay independent because they
only meet at a few **contracts** (feature F0). A feature may depend on a contract, never on another
feature's internals. Change a feature's insides freely; change a contract only on purpose, and
update everything listed as depending on it.

## The seams in one picture

```
 Browser                                   │ Server
                                           │
 F6 Search UI ──┐                          │                  ┌─ F4 Search service ──┐
                ├── HTTP API contract (F0) ┼─ F10 Rate limit ─┤                      ├─ F3 Cache ─ F1 Gateway ─ Watchmode
 F7 Answer UI ──┘          ▲               │                  └─ F5 Availability ────┘     (F2 fixtures in dev/tests)
     │                     │               │                         │
 F8 Converge reveal   F9 Unhappy paths     │                   F11 Posters (TMDB, optional)
 (overlay, knows only "cached" + rows)     │                   F12 Usage view (reads F1's counter)
```

Provider-specific code lives only in F1 and in the two adapters inside F4 and F5. Everything else
speaks Nexus's own types.

## Features

| # | Feature | Depends on | What it owns | Done when |
|---|---|---|---|---|
| F0 | **Contracts** | none | Nexus types (`Movie`, `SearchResult`, `Offer`, `Availability`), the HTTP API (`GET /api/search?q=`, `GET /api/movies/:id/availability`), and the error shape (`no_results`, `not_found`, `provider_unavailable`, `quota_reached`, `rate_limited`). Each answer carries `cached: boolean` and `checkedAt`. | Types and example JSON are committed and reviewed. |
| F1 | **Watchmode gateway** | config only | The only code that calls Watchmode. Key from env, live-calls flag (off by default), kill switch, caps of 60 credits a day and 2,000 a month, persisted credit counter, call log. | Unit tests prove caps block calls and the flag stays off by default. |
| F2 | **Fixtures** | F1's interface | A fake gateway that serves recorded responses, plus the recording script the maintainer runs once (about 10 Swedish movies). | Tests run with no network and no key. |
| F3 | **Cache** | F0 | Persistent key-value cache: search 7 days, availability 24 hours. Says whether an answer was cached. | A repeat lookup makes zero gateway calls. |
| F4 | **Search service** | F0, F1, F3 | Watchmode search → `SearchResult[]` (title, original title, year, ids). Minimum 3 characters, query normalising, merging identical in-flight requests. | Returns the contract shape from fixtures, including Swedish and original titles. |
| F5 | **Availability service** | F0, F1, F3 | Watchmode sources → `Availability` for Sweden only: offers grouped Included / Free / Rent / Buy, duplicates removed, Rent and Buy sorted cheapest first, cheapest flagged. | Fixture tests cover every group, prices, and "not available in Sweden". |
| F6 | **Search UI** | F0 (API contract) | Input with debounce, results list with title, year and poster slot, keyboard and screen-reader support. Built against a mock API first. | Usable on a phone with fixtures behind it. |
| F7 | **Answer UI (static)** | F0 | Movie header, offer groups, prices, Cheapest tag, provider links, "checked at", Watchmode and TMDB credit, empty state. No animation. | Correct and accessible without any motion. |
| F8 | **Converge reveal** | F7's markup, `cached` flag | Discovery streams, Ignite snap, tap to skip, reduced-motion fade. An overlay only: it never changes the answer's content or order. | Removing F8 leaves a fully working app. |
| F9 | **Unhappy paths** | F0 error shape | Screens for no results, not in Sweden, provider slow or down, quota reached, rate limited. | Each error code has a tested screen. |
| F10 | **Visitor rate limit** | F0 error shape | About 20 fresh lookups per hour per visitor. Server middleware, independent of the services. | Exceeding it returns `rate_limited`. |
| F11 | **Posters** | F0 (`tmdbId`) | TMDB poster lookup with its own key and cache. Optional: failure means no poster, never no answer. | Answer and results still render when TMDB fails. |
| F12 | **Usage view** | F1 counter | A small protected page showing credits used today and this month. | Shows real counter values. |
| F13 | **Deploy and README** | everything | Public deployment, secrets in the host's settings, README on product, running locally and the agent-led workflow. | Anyone can use the public URL. |

## Order

1. **F0** first, because everything else leans on it. The technology stack must be chosen before
   F0 is written in code.
2. **F1 → F2 → F3**: the safe plumbing, so no later step can spend credits by accident.
3. **F4, F5** (server) and **F6, F7** (browser) can then be built in either order, because the UI
   runs against the mock API until the services are ready.
4. **F8** on top of F7, then **F9**.
5. **F10, F11, F12** in any order; none of them blocks the core answer.
6. **F13** last, plus a single live check to confirm web links and SEK prices from Watchmode
   (ADR 0001).

## Rules that keep features independent

- UI code never sees Watchmode or TMDB formats, only F0 types.
- Only F1 knows the Watchmode key, URL and credit costs.
- The reveal (F8) receives the finished answer and a `cached` flag. It never fetches, sorts or
  filters data.
- Optional enrichment (F11) is added after the core answer and can fail without breaking it.
- Changing a contract in F0 is a deliberate change with its own review.
