import { getDataSource } from "@/server/data-source";
import { respond } from "@/server/respond";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return respond(
    () => getDataSource().availability(id),
    (availability) => availability,
  );
}
