// What Nexus says when it can't give an answer. The wording lives here, keyed by the API's
// error codes (src/contracts/api.ts), so every screen says the same thing for the same problem.

import type { ErrorCode } from "@/contracts/api";

export interface ProblemDescription {
  title: string;
  detail: string;
  /** Whether trying again straight away could help. */
  canRetry: boolean;
}

/** "under a minute", "about 5 minutes", "about 3 hours". */
export function formatWait(seconds: number): string {
  if (seconds < 60) {
    return "under a minute";
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes === 1) {
    return "about a minute";
  }
  if (minutes < 60) {
    return `about ${minutes} minutes`;
  }

  const hours = Math.ceil(minutes / 60);
  if (hours === 1) {
    return "about an hour";
  }
  return `about ${hours} hours`;
}

function waitSentence(retryAfterSeconds: number | undefined, fallback: string): string {
  if (retryAfterSeconds === undefined) {
    return fallback;
  }
  return `Try again in ${formatWait(retryAfterSeconds)}.`;
}

export function describeProblem(code: ErrorCode, retryAfterSeconds?: number): ProblemDescription {
  if (code === "invalid_query") {
    return {
      title: "Type a little more",
      detail: "Search with at least 3 letters of the title.",
      canRetry: false,
    };
  }

  if (code === "not_found") {
    return {
      title: "We couldn't find that movie",
      detail: "The link may be out of date. Search for the movie again.",
      canRetry: false,
    };
  }

  if (code === "rate_limited") {
    return {
      title: "That's a lot of lookups",
      detail: `You've looked up many new movies in a short time. ${waitSentence(retryAfterSeconds, "Try again in a few minutes.")}`,
      canRetry: false,
    };
  }

  if (code === "quota_reached") {
    return {
      title: "Nexus has used today's lookups",
      detail: `Movies people looked up recently still work. ${waitSentence(retryAfterSeconds, "Try again later.")}`,
      canRetry: false,
    };
  }

  return {
    title: "Streaming data isn't available right now",
    detail: "Nexus couldn't get an answer from its data provider, or your connection dropped. Try again in a moment.",
    canRetry: true,
  };
}
