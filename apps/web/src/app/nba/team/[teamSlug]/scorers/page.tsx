import { NbaTeamPage, nbaTeamStaticParams } from "@/components/nba-pages";

export function generateStaticParams() {
  return nbaTeamStaticParams();
}

export default async function NbaTeamScorersRoute({ params }: { params: Promise<{ teamSlug: string }> }) {
  const { teamSlug } = await params;
  return <NbaTeamPage locale="en" tab="scorers" teamSlug={teamSlug} />;
}
