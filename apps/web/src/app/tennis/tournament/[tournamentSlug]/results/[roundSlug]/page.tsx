import { TennisTournamentPage } from "@/components/tennis-pages";

export default async function TennisTournamentRoundRoute({
  params
}: {
  params: Promise<{ roundSlug: string; tournamentSlug: string }>;
}) {
  const { roundSlug, tournamentSlug } = await params;
  return <TennisTournamentPage locale="en" roundSlug={roundSlug} tournamentSlug={tournamentSlug} />;
}
