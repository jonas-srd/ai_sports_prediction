import { FootballTeamPage } from "@/components/football-pages";

export default async function FootballTeamTableRoute({ params, searchParams }: { params: Promise<{ teamSlug: string }>; searchParams: Promise<{ from?: string }> }) {
  const { teamSlug } = await params;
  const { from } = await searchParams;

  return <FootballTeamPage fromCompetitionSlug={from} locale="en" teamSlug={teamSlug} tab="table" />;
}
