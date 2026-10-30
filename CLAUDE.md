# Nexus-AI

## Glossary

- **Offer:** one way to watch a movie on one service: included in a subscription, free, rent or buy,
  with a price where one applies.
- **Discovery:** the reveal shown when Nexus has to fetch the answer from the data provider.
- **Snap:** the near-instant reveal shown when Nexus already has a valid cached answer.
- **Nexus point:** the glowing point where the streams meet in the Converge animation.

## What Nexus-AI is

Nexus-AI is a focused search utility that answers one question: **"Where can I stream this?"**

It is a version of an existing concept, _Nexus_, built as part of a six-week AI-assisted development
course. The "AI" in the name refers to **how it is built** (agent-led development with Claude Code),
not to features in the product. AI features are only added if we later identify a genuine user
problem they solve.

## The problem

Someone who already knows which movie they want to watch has no quick way to find out where it is
available. They have to check several streaming apps one by one, or use large movie-database sites
full of recommendations, reviews, trending lists and cast details, all of which get in the way of
a simple answer.

## Target user

A person in Sweden who **already knows the movie they want to watch** and wants to know, as fast as
possible, where they can watch it and whether it costs extra.

They are **not** looking for recommendations, reviews, ratings or movie trivia.

## Core user journey

1. **Search** for a movie by title.
2. **Select** the correct movie from the results. Show just enough to tell similar titles apart
   (e.g. release year and poster), and nothing more.
3. **Watch the answer resolve.** A short Converge reveal (see "Experience design") turns into the
   answer. It never adds waiting time.
4. **See where it's available** in Sweden right now, clearly grouped as:
   - Included with a subscription
   - Rent, with prices, cheapest first
   - Buy, with prices, cheapest first
5. **Follow a link** to the relevant service and watch it.

If the movie is not available anywhere in Sweden, say so clearly. That is also an answer.

Success measure: a user goes from opening the app to knowing where to watch a movie in a few
seconds, with as few taps/clicks as possible.

## Initial scope

- **Movies only.** No TV series.
- **Sweden only.** One country, Swedish availability data.

## Explicitly out of scope (initial product)

| Out of scope                                                          | Why                                                                                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Recommendations, "you might also like", trending/popular lists        | The user already knows what they want. This is the discovery-platform trap.                          |
| Reviews, ratings, cast/crew, plot details beyond a minimal identifier | Not needed to answer "where can I stream this?"                                                      |
| TV series                                                             | Seasons and episodes have different availability per season; it adds a lot of complexity.            |
| Countries other than Sweden                                           | Each country multiplies data and testing.                                                            |
| Trailers                                                              | Supplementary; they distract from the core purpose. Reconsider only after the MVP.                   |
| User accounts / login                                                 | Not needed for searching. Would only be justified by a feature that needs saved data across devices. |
| Market-level price intelligence ("is this cheap overall?")            | Needs market-wide price data, not just this movie's offers. Showing prices and sorting them is in scope. |
| Watchlists, history, notifications ("tell me when it's on Netflix")   | Useful later, but each is a product of its own.                                                      |
| AI features in the product (chat search, AI recommendations)          | Only if a genuine user problem is identified later.                                                  |
| Collecting availability data ourselves (scraping streaming services)  | Fragile, likely against terms of service. Availability comes from a data provider.                   |

## Later (after the MVP, if justified)

- **My Streaming Services:** the user picks which services they subscribe to, and Nexus highlights
  "Included in your subscription" first. This is the strongest candidate, because it makes the core
  answer faster. It can likely be stored on the user's device rather than requiring accounts.
- Trailers, as a small, secondary element.
- TV series, other countries.

## Six-week MVP: what it must accomplish

1. A **publicly deployed** app that anyone can use without signing up.
2. Title search that copes with real-world input: typos, partial titles, and **both Swedish and
   original titles** (many films have a Swedish title that differs from the original).
3. A results list that makes it easy to pick the right movie (title, year, poster).
4. A movie view showing current availability in Sweden, grouped as Included / Rent / Buy,
   with links to each service. Rent and Buy offers show their price and are sorted cheapest first,
   with the cheapest clearly marked.
5. The Converge reveal: a discovery animation for fresh answers and the Ignite snap for cached ones
   (see "Experience design").
6. Clear handling of the unhappy paths: no search results, movie not available in Sweden,
   data provider unavailable or slow.
7. Fast, accessible, and usable on a phone.
8. **Factual accuracy:** availability shown is exactly what the data provider returns, never guessed.
   Show how current the data is if the provider exposes it, and credit the provider.
9. A public GitHub repo with a README explaining the product, how to run it, and how it was built
   (agent-led workflow).

## Experience design: Converge

Chosen on 2026-10-30 from six prototypes. Working prototypes: `docs/design/converge-prototype.html`
(direction D) and `docs/design/converge-snaps.html` (snap option 2, Ignite).

**Idea.** "Nexus" is where separate streams of data meet. Each streaming service is a stream of
light. The streams pour in from the screen edges, meet at a glowing nexus point, then fan out to
their rows, where the text decodes from data glyphs into the answer. Futuristic and playful.

**Look.** Dark night-sky navy (`#0a0f1f` to `#18204a`), cyan `#5cf2ff` to magenta `#ff5ccf` gradient
for highlights, glowing service colors. Wordmark "nexus" with the X in the gradient. Typefaces:
Unbounded (display) and Outfit (text).

**Rhythm.** Chaos → anticipation → resolution → answer. Nexus is not gambling: results are
deterministic. Each stream belongs to one real offer and always lands on that offer's row. Only the
motion is decoration.

**Discovery (no cached answer).** The streams animate while data loads, at least ~0.5s so it does
not flicker, then resolve as soon as data arrives. The animation never holds back an answer that is
ready.

**Snap (cached answer): Ignite.** A gradient line flashes across the nexus point and the answer
opens up and down from it in about 0.25s. It should feel like "Nexus has seen this before".

**Rules for every reveal.**
- The answer is real HTML underneath; effects are an overlay. Screen readers get the answer
  immediately (`aria-busy` during the reveal, a polite live announcement after).
- A tap skips the reveal.
- `prefers-reduced-motion`: every reveal becomes a short fade.
- Keep flashes soft and avoid full-screen flicker.
- If optional enrichment (posters etc.) fails, the answer still appears.

## Open questions to resolve before building

- **Data provider:** Which source provides movie metadata and Swedish streaming availability, and
  do its terms allow use in a public app (including a public open-source repo)? This is the single
  biggest risk to the project and should be settled first.
- **"Free with ads" category:** Swedish services such as SVT Play offer movies for free. If the data
  provider distinguishes this, should it be a fourth group alongside Included / Rent / Buy?
  (The design prototypes assume yes, shown as a "Free" group.)
- **Links:** Can we link directly to the movie on each service (deep links), or only to the service?
- **App language:** Swedish, English, or both?
- **Platform:** web app, mobile app, or both? (To be decided with the technology stack.)

## Technology stack

**Not decided yet.** It will be chosen together with the maintainer, with trade-offs explained,
and recorded here and in an Architecture Decision Record (ADR).

## Working principles

- **Simplicity over features.** Every feature must make Nexus substantially better at answering
  "Where can I stream this?" If it doesn't, it doesn't go in.
- **Facts come from the data provider.** Movie information and availability are never invented,
  inferred or filled in by AI or by hand-written defaults.
- **Agent-led, human-decided.** Claude Code implements; the maintainer owns product and
  architecture decisions. Significant decisions are recorded as short ADRs in `docs/adr/`.
- **Understandable and maintainable.** Code should be readable by someone new to the project.
  Prefer simple, well-known solutions over clever ones.
- **Explain jargon.** When proposing technical options, explain unfamiliar terms in plain language.
- **Verify before claiming done.** Run the app and its tests; report failures honestly.

## What AI agents must NOT do

- **Do not choose the technology stack or architecture** without presenting options and trade-offs
  and getting the maintainer's approval.
- **Do not expand scope.** Don't add features from the out-of-scope or later lists, or new ones,
  without explicit approval. Suggest them as follow-ups instead.
- **Do not add AI features to the product** because the project is called Nexus-AI.
- **Do not invent, guess or hard-code** movie data or streaming availability, including in
  fallbacks, placeholders or "sample" data shown to real users.
- **Do not scrape streaming services** or use a data source whose terms haven't been checked.
- **Do not commit secrets** such as API keys or `.env` files.
- **Do not skip, weaken or delete tests** to make checks pass.
- **Do not push to `main`, force-push, or deploy** without the maintainer's go-ahead.
- **Do not make major decisions silently.** Explain the trade-offs and ask.
