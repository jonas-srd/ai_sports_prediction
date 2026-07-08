import { NbaTeamPage, nbaTeamStaticParams } from "@/components/nba-pages";

export function generateStaticParams() {
  return nbaTeamStaticParams();
}

export default async function GermanNbaTeamFairnessRoute({ params }: { params: Promise<{ teamSlug: string }> }) {
  const { teamSlug } = await params;
  return <NbaTeamPage locale="de" tab="fairness" teamSlug={teamSlug} />;
}
