// Records real Watchmode responses into fixtures/watchmode/ so development and tests never
// spend credits (ADR 0002). Run once by the maintainer, with the key in .env.local:
//
//   npm run record-fixtures            # shows the plan and the credit cost, does nothing
//   npm run record-fixtures -- --yes   # records
//
// Costs about 2 credits per movie (search + sources) plus 1 for the "no results" search.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createMemoryStore } from "../src/server/store/memory-store";
import { createCreditBudget } from "../src/server/watchmode/credit-budget";
import { FIXTURE_DIRECTORY } from "../src/server/watchmode/fixture-gateway";
import { fixtureFileName, type WatchmodeFixture } from "../src/server/watchmode/fixtures";
import { createLiveGateway } from "../src/server/watchmode/live-gateway";
import type { WatchmodeRequest } from "../src/server/watchmode/types";

/** Searches chosen to cover Swedish and original titles, accents, and lookalike titles. */
const MOVIE_SEARCHES = [
  "Parasite",
  "Oppenheimer",
  "Spirited Away",
  "The Matrix",
  "Män som hatar kvinnor",
  "The Girl with the Dragon Tattoo",
  "En man som heter Ove",
  "Triangle of Sadness",
  "Amélie",
  "Jönssonligan",
];
const NO_RESULTS_SEARCH = "qzxv no such movie";
const REGION = "SE";

/** Hard ceiling for this script, separate from the app's daily cap. */
const MAX_CREDITS_FOR_RUN = 30;

interface WatchmodeSearchResponse {
  title_results?: { id: number; name: string; type: string; year: number | null }[];
}

function searchRequest(query: string): WatchmodeRequest {
  return { path: "/search/", params: { search_field: "name", search_value: query }, credits: 1 };
}

function sourcesRequest(titleId: number): WatchmodeRequest {
  return { path: `/title/${titleId}/sources/`, params: { regions: REGION }, credits: 1 };
}

async function saveFixture(request: WatchmodeRequest, response: unknown) {
  const fixture: WatchmodeFixture = {
    request: { path: request.path, params: request.params },
    recordedAt: new Date().toISOString(),
    response,
  };
  const filePath = path.join(FIXTURE_DIRECTORY, fixtureFileName(request));
  await writeFile(filePath, JSON.stringify(fixture, null, 2) + "\n");
  console.log(`  saved ${path.relative(process.cwd(), filePath)}`);
}

async function main() {
  const estimatedCredits = MOVIE_SEARCHES.length * 2 + 1;
  console.log(`Plan: ${MOVIE_SEARCHES.length} movie searches + their ${REGION} sources, plus 1 empty search.`);
  console.log(`Estimated cost: about ${estimatedCredits} Watchmode credits (run ceiling ${MAX_CREDITS_FOR_RUN}).`);

  if (!process.argv.includes("--yes")) {
    console.log("Nothing recorded. Re-run with --yes to record.");
    return;
  }

  const apiKey = process.env.WATCHMODE_API_KEY;
  if (!apiKey) {
    console.error("WATCHMODE_API_KEY is not set. Put it in .env.local (never commit it).");
    process.exitCode = 1;
    return;
  }

  const budget = createCreditBudget(createMemoryStore(), {
    dailyCap: MAX_CREDITS_FOR_RUN,
    monthlyCap: MAX_CREDITS_FOR_RUN,
  });
  const gateway = createLiveGateway({ apiKey, budget, fetchImpl: fetch });
  await mkdir(FIXTURE_DIRECTORY, { recursive: true });

  for (const query of MOVIE_SEARCHES) {
    console.log(`Searching "${query}"`);
    const search = searchRequest(query);
    const searchResponse = await gateway.request<WatchmodeSearchResponse>(search);
    await saveFixture(search, searchResponse);

    const results = searchResponse.title_results ?? [];
    const firstMovie = results.find((result) => result.type === "movie");
    if (firstMovie === undefined) {
      console.log("  no movie in the results; skipping sources");
      continue;
    }

    console.log(`  fetching sources for ${firstMovie.name} (${firstMovie.year})`);
    const sources = sourcesRequest(firstMovie.id);
    const sourcesResponse = await gateway.request<unknown>(sources);
    await saveFixture(sources, sourcesResponse);
  }

  console.log(`Searching "${NO_RESULTS_SEARCH}"`);
  const emptySearch = searchRequest(NO_RESULTS_SEARCH);
  await saveFixture(emptySearch, await gateway.request<unknown>(emptySearch));

  const usage = await budget.usage();
  console.log(`Done. Credits used by this run: ${usage.today}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
