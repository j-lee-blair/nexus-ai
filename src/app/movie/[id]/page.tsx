import { AnswerScreen } from "@/ui/components/AnswerScreen";
import { SearchScreen } from "@/ui/components/SearchScreen";
import { SplitLayout } from "@/ui/components/SplitLayout";
import { firstValue } from "../../search-params";

interface MoviePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function MoviePage({ params, searchParams }: MoviePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const searchQuery = firstValue(query.q);

  const search = <SearchScreen initialQuery={searchQuery} selectedMovieId={id} />;
  // Keyed by movie, so picking another result starts a fresh answer and reveal.
  const answer = <AnswerScreen key={id} movieId={id} query={searchQuery} />;
  return <SplitLayout search={search} answer={answer} />;
}
