import { NbaTeamPage, nbaTeamStaticParams } from "@/components/nba-pages";

export function generateStaticParams() {
  return nbaTeamStaticParams();
}

export default async function NbaTeamRunningRoute({ params }: { params: Promise<{ teamSlug: string }> }) {
  const { teamSlug } = await params;
  return <NbaTeamPage locale="en" tab="running" teamSlug={teamSlug} />;
}
