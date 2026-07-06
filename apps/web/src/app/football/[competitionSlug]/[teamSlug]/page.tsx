import type { Metadata } from "next";
import { FootballTeamPage, footballTeamStaticParams } from "@/components/football-pages";
import { getCompetition, getTeam } from "@/lib/football-data";

type PageProps = {
  params: Promise<{ competitionSlug: string; teamSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { competitionSlug, teamSlug } = await params;
  const competition = getCompetition(competitionSlug);
  const team = getTeam(competitionSlug, teamSlug);

  return {
    title: `${team?.name ?? "Team"} | ${competition?.name ?? "Football"} | AI Sport Prediction`,
    description: team ? `${team.name} team profile, model signals, form and prediction view.` : "Football team prediction profile."
  };
}

export function generateStaticParams() {
  return footballTeamStaticParams();
}

export default async function TeamPage({ params }: PageProps) {
  const { competitionSlug, teamSlug } = await params;

  return <FootballTeamPage competitionSlug={competitionSlug} locale="en" teamSlug={teamSlug} />;
}
