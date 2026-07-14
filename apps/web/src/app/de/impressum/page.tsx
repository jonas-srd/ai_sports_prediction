import type { Metadata } from "next";
import { ObfuscatedEmail } from "@/components/obfuscated-email";

export const metadata: Metadata = {
  title: "Impressum | AI Sports Prediction",
  description: "Impressum und Anbieterinformationen für AI Sports Prediction."
};

const contactEmail = <ObfuscatedEmail reversedDomain="moc.kooltuo" reversedLocalPart="noitciderp-strops-ia" />;

export default function GermanLegalNoticePage() {
  return (
    <main className="footballDetailShell sportschauFootballPage legalPageShell">
      <section className="competitionHero legalHero">
        <div className="sportschauCompetitionTitle">
          <p className="footballEyebrow">Rechtliches</p>
          <h1>Impressum</h1>
          <p>Kontakt- und Anbieterinformationen für AI Sports Prediction.</p>
        </div>
      </section>

      <section className="footballPanel legalPagePanel" aria-labelledby="legal-title">
        <div className="sportschauSectionTitle">
          <span>AI Sports Prediction</span>
          <h2 id="legal-title">Impressum</h2>
        </div>

        <div className="legalPageBlock">
          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            Jonas Schröder
            <br />
            AI Sports Prediction
            <br />
            81541 Munich
            <br />
            Deutschland
            <br />
            Postanschrift auf Anfrage: {contactEmail}
          </p>
        </div>

        <div className="legalPageBlock">
          <h2>Kontakt</h2>
          <p>E-Mail: {contactEmail}</p>
        </div>

        <div className="legalPageBlock">
          <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>Jonas Schröder (Anschrift wie oben)</p>
        </div>

        <div className="legalPageBlock">
          <h2>EU-Streitschlichtung</h2>
          <p>
            Die Europäische Kommission stellt keine Plattform zur Online-Streitbeilegung mehr bereit.
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>

        <div className="legalPageBlock">
          <h2>Haftung für Inhalte</h2>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
            nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
            Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
            Informationen zu überwachen.
          </p>
        </div>
      </section>
    </main>
  );
}
