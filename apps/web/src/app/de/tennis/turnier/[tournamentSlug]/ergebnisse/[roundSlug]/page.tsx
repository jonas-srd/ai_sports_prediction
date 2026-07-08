import { TennisTournamentPage } from "@/components/tennis-pages";

export default async function GermanTennisTournamentRoundRoute({
  params
}: {
  params: Promise<{ roundSlug: string; tournamentSlug: string }>;
}) {
  const { roundSlug, tournamentSlug } = await params;
  return <TennisTournamentPage locale="de" roundSlug={roundSlug} tournamentSlug={tournamentSlug} />;
}
