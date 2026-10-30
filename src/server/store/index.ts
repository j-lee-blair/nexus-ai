import { createMemoryStore } from "./memory-store";
import { createUpstashStore } from "./upstash-store";
import type { KeyValueStore } from "./types";

export type { KeyValueStore } from "./types";
export { createMemoryStore } from "./memory-store";

let store: KeyValueStore | undefined;

/**
 * Upstash when its credentials are set (Vercel), otherwise memory (local development).
 * A memory store on Vercel would reset the credit counter on every cold start, so it is refused there.
 */
export function getStore(env: NodeJS.ProcessEnv = process.env): KeyValueStore {
  if (store !== undefined) {
    return store;
  }

  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    store = createUpstashStore(url, token);
  } else if (env.VERCEL) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set on Vercel.");
  } else {
    store = createMemoryStore();
  }

  return store;
}
