import { redirect } from "next/navigation";
import { footballTeamStaticParams } from "@/components/football-pages";
import { localizePath } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ competitionSlug: string; teamSlug: string }>;
};

export function generateStaticParams() {
  return footballTeamStaticParams();
}

export default async function GermanTeamStatsPage({ params }: PageProps) {
  const { competitionSlug, teamSlug } = await params;

  redirect(`${localizePath(`/football/team/${teamSlug}/teamstatistik`, "de")}?from=${encodeURIComponent(competitionSlug)}`);
}
