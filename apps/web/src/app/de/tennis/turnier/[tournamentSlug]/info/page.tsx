import { TennisTournamentPage, tennisTournamentStaticParams } from "@/components/tennis-pages";

export function generateStaticParams() {
  return tennisTournamentStaticParams();
}

export default async function GermanTennisTournamentInfoRoute({ params }: { params: Promise<{ tournamentSlug: string }> }) {
  const { tournamentSlug } = await params;
  return <TennisTournamentPage locale="de" tab="info" tournamentSlug={tournamentSlug} />;
}
