import { AnswerScreen } from "@/ui/components/AnswerScreen";

interface MoviePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function MoviePage({ params, searchParams }: MoviePageProps) {
  const { id } = await params;
  const query = await searchParams;

  let backQuery = "";
  if (typeof query.q === "string") {
    backQuery = query.q;
  }

  return <AnswerScreen movieId={id} query={backQuery} />;
}
