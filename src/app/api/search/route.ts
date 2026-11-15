import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from "@/contracts/api";
import { getDataSource } from "@/server/data-source";
import { failure, respond } from "@/server/respond";
import { visitorIdFrom } from "@/server/visitor-limit";

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < MIN_QUERY_LENGTH) {
    return failure("invalid_query", `Type at least ${MIN_QUERY_LENGTH} characters to search.`);
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return failure("invalid_query", `Search with at most ${MAX_QUERY_LENGTH} characters.`);
  }

  const visitorId = visitorIdFrom(request);
  const dataSource = getDataSource(visitorId);
  return respond(
    () => dataSource.search(query),
    (results) => ({ query, results }),
  );
}
