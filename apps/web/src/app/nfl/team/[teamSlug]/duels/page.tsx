import { NflTeamPage, nflTeamStaticParams } from "@/components/nfl-pages";

export function generateStaticParams() {
  return nflTeamStaticParams();
}

export default async function NflTeamDuelsRoute({ params }: { params: Promise<{ teamSlug: string }> }) {
  const { teamSlug } = await params;
  return <NflTeamPage locale="en" tab="duels" teamSlug={teamSlug} />;
}
