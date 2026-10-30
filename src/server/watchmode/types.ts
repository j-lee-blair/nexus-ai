/** Query parameters for a Watchmode request, without the API key. */
export type WatchmodeParams = Record<string, string>;

export interface WatchmodeRequest {
  /** Path under https://api.watchmode.com/v1, e.g. "/search/". */
  path: string;
  params: WatchmodeParams;
  /** Credits Watchmode charges for this call (see ADR 0002 and Watchmode's API docs). */
  credits: number;
}

/**
 * The only way Nexus talks to Watchmode. The live gateway (F1) calls the API behind credit caps;
 * the fixture gateway (F2) answers from recorded responses for development and tests.
 */
export interface WatchmodeGateway {
  request<T>(request: WatchmodeRequest): Promise<T>;
}

export interface CreditUsage {
  today: number;
  thisMonth: number;
  dailyCap: number;
  monthlyCap: number;
}
