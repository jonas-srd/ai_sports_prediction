import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { footballTeamStaticParams } from "@/components/football-pages";
import { getCompetition, getTeam } from "@/lib/football-data";
import { localizePath } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ competitionSlug: string; teamSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { competitionSlug, teamSlug } = await params;
  const competition = getCompetition(competitionSlug);
  const team = getTeam(competitionSlug, teamSlug);

  return {
    title: `${team?.name ?? "Team"} | ${competition?.name ?? "Fußball"} | AI Sport Prediction`,
    description: team ? `${team.name} Teamprofil, Modell-Signale, Form und Prognose.` : "Fußball-Teamprofil."
  };
}

export function generateStaticParams() {
  return footballTeamStaticParams();
}

export default async function GermanTeamPage({ params }: PageProps) {
  const { competitionSlug, teamSlug } = await params;

  redirect(`${localizePath(`/football/team/${teamSlug}`, "de")}?from=${encodeURIComponent(competitionSlug)}`);
}
