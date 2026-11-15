import { getDataSource } from "@/server/data-source";
import { respond } from "@/server/respond";
import { visitorIdFrom } from "@/server/visitor-limit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorId = visitorIdFrom(request);
  const dataSource = getDataSource(visitorId);
  return respond(
    () => dataSource.availability(id),
    (availability) => availability,
  );
}
