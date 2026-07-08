import { SportMatchDetailPage, type MatchDetailTab } from "@/components/match-detail-page";

export default async function GermanFootballMatchRoute({
  params,
  searchParams
}: {
  params: Promise<{ competitionSlug: string; matchId: string }>;
  searchParams: Promise<{ tab?: MatchDetailTab } & Record<string, string | undefined>>;
}) {
  const { competitionSlug, matchId } = await params;
  const query = await searchParams;

  return (
    <SportMatchDetailPage
      competitionSlug={competitionSlug}
      locale="de"
      matchId={matchId}
      searchParams={query}
      sport="football"
      tab={query.tab}
    />
  );
}
