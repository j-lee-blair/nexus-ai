import { MIN_QUERY_LENGTH } from "@/contracts/api";
import { getDataSource } from "@/server/data-source";
import { failure, respond } from "@/server/respond";

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < MIN_QUERY_LENGTH) {
    return failure("invalid_query", `Type at least ${MIN_QUERY_LENGTH} characters to search.`);
  }
  return respond(
    () => getDataSource().search(query),
    (results) => ({ query, results }),
  );
}
