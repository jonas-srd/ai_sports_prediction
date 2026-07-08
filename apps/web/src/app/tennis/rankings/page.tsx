import { TennisPage } from "@/components/tennis-pages";

type PageProps = {
  searchParams: Promise<{ country?: string; top?: string }>;
};

export default async function TennisRankingsPage({ searchParams }: PageProps) {
  const { country, top } = await searchParams;

  return (
    <TennisPage
      locale="en"
      rankingCountry={country}
      rankingTop={top ? Number(top) : undefined}
      tab="rankings"
    />
  );
}
