import { FootballCompetitionPage, footballStaticParams } from "@/components/football-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ competitionSlug: string }>;
  searchParams: Promise<{ spieltag?: string; round?: string }>;
};

export function generateStaticParams() {
  return footballStaticParams();
}

export default async function GermanCompetitionMatchdayPage({ params, searchParams }: PageProps) {
  const { competitionSlug } = await params;
  const { round, spieltag } = await searchParams;

  return <FootballCompetitionPage competitionSlug={competitionSlug} locale="de" selectedMatchday={spieltag ?? round} tab="matchday" />;
}
