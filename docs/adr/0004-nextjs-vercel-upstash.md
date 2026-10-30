# ADR 0004: Next.js on Vercel with Upstash Redis

- Status: Accepted
- Date: 2026-10-30

## Context

Nexus needs a phone-friendly web page, a small server that holds the Watchmode and TMDB keys, and
a little persistent storage for the cache and the credit counter (ADR 0002). The maintainer has
1 to 2 hours a week, so setup and hosting must be simple and free.

Options considered:

1. **Next.js (React, TypeScript) + Vercel + Upstash Redis.** One codebase for pages and server
   routes, free hosting that deploys on every push, free managed Redis for cache and counter.
2. **SvelteKit + Vercel + Upstash.** Same hosting and storage, less code, smaller ecosystem.
3. **Plain Node server + SQLite on Render.** One process and a file database; hosting with a
   persistent disk is fiddlier.

## Decision

Option 1: **Next.js with TypeScript, hosted on Vercel, with Upstash Redis** for the cache and the
credit counter. Nexus is a **web app**; no native mobile app for the MVP.

Plain terms: *Next.js* is a React framework where pages and small server endpoints live in the same
project. *Vercel* hosts it and redeploys on every push. *Upstash Redis* is a hosted key-value store,
used here as a shared memory the server can read and write between requests.

## Consequences

- Watchmode and TMDB calls run only in server route handlers; keys are Vercel environment variables.
- The Converge canvas animation runs as a client-side React component.
- Vercel's free Hobby plan is for non-commercial use, which matches the Watchmode free plan.
- Tests use fixtures and an in-memory stand-in for Redis, so they need no accounts or network.
