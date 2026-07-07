import { FootballCompetitionPage, footballStaticParams } from "@/components/football-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ competitionSlug: string }>;
};

export function generateStaticParams() {
  return footballStaticParams();
}

export default async function GermanCompetitionRoundsPage({ params }: PageProps) {
  const { competitionSlug } = await params;

  return <FootballCompetitionPage competitionSlug={competitionSlug} locale="de" tab="rounds" />;
}
