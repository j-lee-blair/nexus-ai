# Nexus

**Where can I stream this?** Search for a movie and see where it's available in Sweden, what it
costs, and jump straight to it. Built with agent-led development (see `CLAUDE.md`).

## Run it locally

```bash
npm ci
cp .env.example .env.local   # uses made-up mock data; no API keys needed
npm run dev                  # http://localhost:3000
```

Checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Where things are

- `src/domain/`: Nexus's own types and rules (e.g. grouping and sorting offers)
- `src/contracts/`: the browser–server API contract ([docs/api.md](docs/api.md))
- `src/server/data-source/`: where answers come from (mock today, Watchmode next)
- `src/app/api/`: the two API endpoints
- `docs/`: [feature breakdown](docs/features.md), [decisions](docs/adr/), [design prototypes](docs/design/)
