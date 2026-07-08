import { TennisPlayerPage, tennisPlayerStaticParams } from "@/components/tennis-pages";

export function generateStaticParams() {
  return tennisPlayerStaticParams();
}

export default async function GermanTennisPlayerRoute({ params }: { params: Promise<{ playerSlug: string }> }) {
  const { playerSlug } = await params;
  return <TennisPlayerPage locale="de" playerSlug={playerSlug} />;
}
