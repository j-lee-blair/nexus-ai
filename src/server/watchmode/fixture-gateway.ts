import { readFile } from "node:fs/promises";
import path from "node:path";
import { DataSourceError } from "@/server/data-source/types";
import { fixtureFileName, type WatchmodeFixture } from "./fixtures";
import type { WatchmodeGateway, WatchmodeRequest } from "./types";

export const FIXTURE_DIRECTORY = path.join(process.cwd(), "fixtures", "watchmode");

/** Answers Watchmode requests from recorded files. Never touches the network or spends credits. */
export function createFixtureGateway(directory: string = FIXTURE_DIRECTORY): WatchmodeGateway {
  return {
    async request<T>(request: WatchmodeRequest): Promise<T> {
      const fileName = fixtureFileName(request);
      const filePath = path.join(directory, fileName);

      let text: string;
      try {
        text = await readFile(filePath, "utf8");
      } catch {
        throw new DataSourceError(
          "provider_unavailable",
          `No recorded Watchmode response for this request (missing fixture ${fileName}).`,
        );
      }

      const fixture = JSON.parse(text) as WatchmodeFixture;
      return fixture.response as T;
    },
  };
}
