// Tests must never reach the network (ADR 0002). Any real fetch fails loudly.
globalThis.fetch = async (input: RequestInfo | URL) => {
  throw new Error(`Network access is blocked in tests (tried ${String(input)})`);
};
