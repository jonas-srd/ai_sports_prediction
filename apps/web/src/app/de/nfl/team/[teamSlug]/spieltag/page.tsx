import { NflTeamPage, nflTeamStaticParams } from "@/components/nfl-pages";

export function generateStaticParams() {
  return nflTeamStaticParams();
}

export default async function GermanNflTeamMatchesRoute({ params }: { params: Promise<{ teamSlug: string }> }) {
  const { teamSlug } = await params;

  return <NflTeamPage locale="de" tab="matches" teamSlug={teamSlug} />;
}
