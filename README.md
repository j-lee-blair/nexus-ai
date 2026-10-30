# Nexus

**Where can I stream this?** Search for a movie and see where it's available in Sweden, what it
costs, and jump straight to it. Built with agent-led development (see `CLAUDE.md`).

## Run it locally

```bash
npm ci
cp .env.example .env.local   # uses made-up mock data; no API keys needed
npm run dev                  # http://localhost:3000
```

### Watchmode data without spending credits

Development and tests answer Watchmode requests from recorded files in `fixtures/watchmode/`
(ADR 0002). Live calls only happen when `WATCHMODE_LIVE_CALLS=on` and a key is set, and are capped
at 60 credits a day and 2,000 a month.

To record the fixtures (once, about 21 credits), put `WATCHMODE_API_KEY` in `.env.local`, then:

```bash
npm run record-fixtures          # shows the plan and cost, records nothing
npm run record-fixtures -- --yes # records
```

Checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Where things are

- `src/domain/`: Nexus's own types and rules (e.g. grouping and sorting offers)
- `src/contracts/`: the browser–server API contract ([docs/api.md](docs/api.md))
- `src/server/data-source/`: where answers come from (mock today, Watchmode next)
- `src/server/watchmode/`: the only code that talks to Watchmode: credit caps, live and fixture gateways
- `src/server/cache.ts`, `src/server/store/`: the read-through cache on Upstash Redis (memory locally)
- `src/app/api/`: the two API endpoints
- `docs/`: [feature breakdown](docs/features.md), [decisions](docs/adr/), [design prototypes](docs/design/)
