import { FootballTeamPage, footballCanonicalTeamStaticParams } from "@/components/football-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ from?: string }>;
};

export function generateStaticParams() {
  return footballCanonicalTeamStaticParams();
}

export default async function CanonicalTeamStatsPage({ params, searchParams }: PageProps) {
  const { teamSlug } = await params;
  const { from } = await searchParams;

  return <FootballTeamPage fromCompetitionSlug={from} locale="en" teamSlug={teamSlug} tab="stats" />;
}
