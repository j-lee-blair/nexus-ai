import { SearchScreen } from "@/ui/components/SearchScreen";

interface HomeProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const initialQuery = firstValue(params.q);

  return <SearchScreen initialQuery={initialQuery} />;
}

/** ?q= can appear more than once in a hand-typed URL; use the first. */
function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  if (value === undefined) {
    return "";
  }
  return value;
}
