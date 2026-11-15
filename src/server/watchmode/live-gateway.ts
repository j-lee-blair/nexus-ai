import { DataSourceError, PROVIDER_UNAVAILABLE_MESSAGE } from "@/server/errors";
import type { CreditBudget } from "./credit-budget";
import type { WatchmodeGateway, WatchmodeRequest } from "./types";

const BASE_URL = "https://api.watchmode.com/v1";
const TIMEOUT_MS = 8000;

export interface LiveGatewayOptions {
  apiKey: string;
  budget: CreditBudget;
  /** Injected so tests never touch the network. */
  fetchImpl: typeof fetch;
  log?: (message: string, details: Record<string, unknown>) => void;
}

function buildUrl(request: WatchmodeRequest, apiKey: string): string {
  const url = new URL(BASE_URL + request.path);
  for (const [name, value] of Object.entries(request.params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("apiKey", apiKey);
  return url.toString();
}

/** Calls the real Watchmode API, but only after the credit budget has approved the call. */
export function createLiveGateway(options: LiveGatewayOptions): WatchmodeGateway {
  const log = options.log ?? ((message, details) => console.info(message, JSON.stringify(details)));

  return {
    async request<T>(request: WatchmodeRequest): Promise<T> {
      // Without a working counter Nexus can't keep to its credit caps, so it makes no call.
      let reservation: Awaited<ReturnType<CreditBudget["reserve"]>>;
      try {
        reservation = await options.budget.reserve(request.credits);
      } catch (error) {
        log("watchmode.budget_unavailable", { path: request.path, error: String(error) });
        throw new DataSourceError("provider_unavailable", PROVIDER_UNAVAILABLE_MESSAGE);
      }

      if (!reservation.allowed) {
        log("watchmode.refused", { path: request.path, credits: request.credits, ...reservation.usage });
        throw new DataSourceError(
          "quota_reached",
          "Nexus has reached its lookup limit for now. Try again later.",
          reservation.retryAfterSeconds,
        );
      }

      // The key is only added here and is never logged.
      log("watchmode.call", { path: request.path, credits: request.credits, ...reservation.usage });

      let response: Response;
      try {
        response = await options.fetchImpl(buildUrl(request, options.apiKey), {
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        throw new DataSourceError("provider_unavailable", PROVIDER_UNAVAILABLE_MESSAGE);
      }

      // Watchmode answers 404 for a title id it doesn't know: that is the visitor's "not found",
      // not a provider failure.
      if (response.status === 404) {
        log("watchmode.not_found", { path: request.path });
        throw new DataSourceError("not_found", "Watchmode doesn't know this title id.");
      }

      if (!response.ok) {
        log("watchmode.error", { path: request.path, status: response.status });
        throw new DataSourceError("provider_unavailable", PROVIDER_UNAVAILABLE_MESSAGE);
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        log("watchmode.invalid_json", { path: request.path });
        throw new DataSourceError("provider_unavailable", PROVIDER_UNAVAILABLE_MESSAGE);
      }
      // The mappers check the fields they use, so an unexpected shape fails there.
      return body as T;
    },
  };
}
