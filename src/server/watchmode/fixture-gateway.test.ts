import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFixtureGateway } from "./fixture-gateway";
import { fixtureFileName } from "./fixtures";
import { getWatchmodeGateway } from "./index";
import type { WatchmodeRequest } from "./types";

const search: WatchmodeRequest = {
  path: "/search/",
  params: { search_value: "Amélie", search_field: "name" },
  credits: 1,
};

describe("fixture file names", () => {
  it("are the same whatever order the parameters come in", () => {
    const reordered = { ...search, params: { search_field: "name", search_value: "Amélie" } };

    expect(fixtureFileName(search)).toBe(fixtureFileName(reordered));
    expect(fixtureFileName(search)).toBe("search__search_field-name__search_value-am-lie.json");
  });
});

describe("fixture gateway", () => {
  it("answers from a recorded file", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-fixtures-"));
    const fixture = { request: search, recordedAt: "2026-10-30T00:00:00Z", response: { title_results: [] } };
    await writeFile(path.join(directory, fixtureFileName(search)), JSON.stringify(fixture));
    const gateway = createFixtureGateway(directory);

    const body = await gateway.request(search);

    expect(body).toEqual({ title_results: [] });
  });

  it("fails clearly when no fixture was recorded", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-fixtures-"));
    const gateway = createFixtureGateway(directory);

    const call = gateway.request(search);

    await expect(call).rejects.toMatchObject({ code: "provider_unavailable" });
  });
});

describe("choosing a gateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function requestMakesNetworkCall(env: NodeJS.ProcessEnv): Promise<boolean> {
    const fetchSpy = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);
    const gateway = getWatchmodeGateway(env);

    try {
      await gateway.request(search);
    } catch {
      // A missing fixture is fine here; we only care whether the network was used.
    }
    return fetchSpy.mock.calls.length > 0;
  }

  it("uses fixtures by default, even with a key set", async () => {
    const env: NodeJS.ProcessEnv = { NODE_ENV: "test", WATCHMODE_API_KEY: "secret-key" };

    expect(await requestMakesNetworkCall(env)).toBe(false);
  });

  it("uses fixtures when the kill switch is on", async () => {
    const env: NodeJS.ProcessEnv = { NODE_ENV: "test", WATCHMODE_API_KEY: "secret-key", WATCHMODE_LIVE_CALLS: "on", WATCHMODE_KILL_SWITCH: "on" };

    expect(await requestMakesNetworkCall(env)).toBe(false);
  });

  it("goes live only when live calls are on and a key is set", async () => {
    const env: NodeJS.ProcessEnv = { NODE_ENV: "test", WATCHMODE_API_KEY: "secret-key", WATCHMODE_LIVE_CALLS: "on" };

    expect(await requestMakesNetworkCall(env)).toBe(true);
  });
});
