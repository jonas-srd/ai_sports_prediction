import { SportMatchDetailPage, type MatchDetailTab } from "@/components/match-detail-page";

export default async function NbaMatchRoute({
  params,
  searchParams
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ tab?: MatchDetailTab } & Record<string, string | undefined>>;
}) {
  const { matchId } = await params;
  const query = await searchParams;

  return <SportMatchDetailPage locale="en" matchId={matchId} searchParams={query} sport="nba" tab={query.tab} />;
}
