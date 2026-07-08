import { FootballTeamPage } from "@/components/football-pages";

export default async function GermanFootballTeamInfoRoute({ params, searchParams }: { params: Promise<{ teamSlug: string }>; searchParams: Promise<{ from?: string }> }) {
  const { teamSlug } = await params;
  const { from } = await searchParams;

  return <FootballTeamPage fromCompetitionSlug={from} locale="de" teamSlug={teamSlug} tab="info" />;
}
