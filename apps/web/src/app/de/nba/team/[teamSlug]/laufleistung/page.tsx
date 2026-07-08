import { NbaTeamPage, nbaTeamStaticParams } from "@/components/nba-pages";

export function generateStaticParams() {
  return nbaTeamStaticParams();
}

export default async function GermanNbaTeamRunningRoute({ params }: { params: Promise<{ teamSlug: string }> }) {
  const { teamSlug } = await params;
  return <NbaTeamPage locale="de" tab="running" teamSlug={teamSlug} />;
}
