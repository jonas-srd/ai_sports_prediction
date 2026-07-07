import { FootballCompetitionPage, footballStaticParams } from "@/components/football-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ competitionSlug: string }>;
  searchParams: Promise<{ matchday?: string; round?: string }>;
};

export function generateStaticParams() {
  return footballStaticParams();
}

export default async function CompetitionMatchdayPage({ params, searchParams }: PageProps) {
  const { competitionSlug } = await params;
  const { matchday, round } = await searchParams;

  return <FootballCompetitionPage competitionSlug={competitionSlug} locale="en" selectedMatchday={matchday ?? round} tab="matchday" />;
}
