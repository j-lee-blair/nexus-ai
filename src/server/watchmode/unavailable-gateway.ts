import { DataSourceError } from "@/server/errors";
import type { WatchmodeGateway, WatchmodeRequest } from "./types";

/**
 * Used on the public site when live calls are off or the kill switch is on. Every lookup fails
 * as "provider unavailable", so visitors get an honest error instead of old recorded answers.
 */
export function createUnavailableGateway(): WatchmodeGateway {
  return {
    async request<T>(request: WatchmodeRequest): Promise<T> {
      console.warn("watchmode.unavailable", JSON.stringify({ path: request.path }));
      throw new DataSourceError(
        "provider_unavailable",
        "Live Watchmode calls are off here, and recorded answers are not allowed on the public site.",
      );
    },
  };
}
