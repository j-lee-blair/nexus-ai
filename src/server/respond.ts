import { NextResponse } from "next/server";
import { ERROR_STATUS, type ApiFailure, type ApiSuccess, type ErrorCode } from "@/contracts/api";
import { DataSourceError, type SourceResult } from "@/server/data-source";

const NO_STORE = { "Cache-Control": "no-store" };

export function failure(code: ErrorCode, message: string, retryAfterSeconds?: number) {
  const body: ApiFailure = {
    ok: false,
    error: retryAfterSeconds === undefined ? { code, message } : { code, message, retryAfterSeconds },
  };
  return NextResponse.json(body, { status: ERROR_STATUS[code], headers: NO_STORE });
}

/** Runs a data-source call and turns its result or error into the API contract shape. */
export async function respond<S, T>(load: () => Promise<SourceResult<S>>, shape: (data: S) => T) {
  try {
    const result = await load();
    const body: ApiSuccess<T> = {
      ok: true,
      data: shape(result.data),
      cached: result.cached,
      checkedAt: result.checkedAt,
    };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof DataSourceError) {
      return failure(error.code, error.message, error.retryAfterSeconds);
    }
    console.error("Unexpected data source error", error);
    return failure("provider_unavailable", "Movie data is unavailable right now. Try again soon.");
  }
}
