import { SearchScreen } from "@/ui/components/SearchScreen";
import { SplitLayout } from "@/ui/components/SplitLayout";
import { firstValue } from "./search-params";

interface HomeProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const initialQuery = firstValue(params.q);

  return <SplitLayout search={<SearchScreen initialQuery={initialQuery} />} answer={null} />;
}
