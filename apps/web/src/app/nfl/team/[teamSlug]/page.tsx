import { NflTeamPage, nflTeamStaticParams } from "@/components/nfl-pages";

export function generateStaticParams() {
  return nflTeamStaticParams();
}

export default async function NflTeamRoute({ params }: { params: Promise<{ teamSlug: string }> }) {
  const { teamSlug } = await params;

  return <NflTeamPage locale="en" teamSlug={teamSlug} />;
}
