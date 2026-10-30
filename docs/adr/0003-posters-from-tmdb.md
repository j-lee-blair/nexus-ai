# ADR 0003: Posters from TMDB

- Status: Accepted
- Date: 2026-10-30

## Context

Posters help users pick the right movie among similar titles. Watchmode's terms say it does not
license the images it returns and forbid hotlinking its image CDN.

## Decision

Take poster thumbnails from **TMDB** (The Movie Database), using the TMDB id that Watchmode returns
for each title. Posters are optional enrichment: if TMDB fails or has no poster, results and
availability still appear without one.

## Consequences

- Follow TMDB's API terms, including its attribution ("This product uses the TMDB API but is not
  endorsed or certified by TMDB") and its logo guidelines.
- A second API key (TMDB) is stored and protected the same way as the Watchmode key.
- TMDB calls do not use Watchmode credits.
