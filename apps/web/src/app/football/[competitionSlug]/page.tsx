import type { Metadata } from "next";
import { FootballCompetitionPage, footballStaticParams } from "@/components/football-pages";
import { getCompetition } from "@/lib/football-data";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ competitionSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { competitionSlug } = await params;
  const competition = getCompetition(competitionSlug);

  return {
    title: `${competition?.name ?? "Football"} | AI Sport Prediction`,
    description: competition?.description ?? "Football prediction hub."
  };
}

export function generateStaticParams() {
  return footballStaticParams();
}

export default async function CompetitionPage({ params }: PageProps) {
  const { competitionSlug } = await params;

  return <FootballCompetitionPage competitionSlug={competitionSlug} locale="en" />;
}
