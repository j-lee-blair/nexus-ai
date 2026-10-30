# ADR 0002: Safeguards for Watchmode API credits

- Status: Accepted
- Date: 2026-10-30

## Context

The free Watchmode plan gives 2,500 credits a month. Development, tests, bots or a bug must not be
able to use them up.

## Decision

**The key**
- Lives only in the hosting provider's secret settings and the maintainer's local `.env`
  (git-ignored). Never in the repo, the browser or a chat with an agent.
- The browser talks only to the Nexus server; only the server calls Watchmode.

**Development and tests use no credits**
- Code and tests run against recorded Watchmode responses ("fixtures") stored in the repo.
  Tests fail if they try to reach the network.
- Fixtures are recorded once by the maintainer, locally, with a script that fetches a fixed list of
  about 10 Swedish test movies (about 20 credits).
- Live calls require an explicit setting (off by default), plus a kill switch that stops all calls.

**One guarded gateway**
- Every Watchmode call goes through one module that checks a persisted credit counter first.
- Hard caps: **60 credits a day, 2,000 a month** (500 spare). When a cap is reached, Nexus shows a
  "try again later" state instead of calling. If Watchmode exposes its own usage figure, the gateway
  checks it too.
- Each call is logged with its credit cost; a small usage view shows today's and this month's totals.

**Fewer calls**
- Persistent cache: availability for 24 hours, search results for 7 days (within the 30-day rule).
  This cache also decides between the Discovery reveal and the Ignite snap.
- Search runs on submit or after a short typing pause, from 3 characters, never per keystroke.
  Identical in-flight requests are merged.
- Availability is fetched only when a movie is selected, never for every search result.
- About 20 fresh lookups per hour per visitor.

## Consequences

The app needs a small persistent store for the cache and the credit counter. The choice of store is
part of the technology stack decision.
