import type { Metadata } from "next";
import { ObfuscatedEmail } from "@/components/obfuscated-email";

export const metadata: Metadata = {
  title: "Impressum | LLM SoccerArena",
  description: "Impressum und Anbieterinformationen für LLM SoccerArena."
};

export default function GermanLegalNoticePage() {
  return (
    <main className="shell legalShell">
      <section className="hero compactHero">
        <p className="eyebrow">Rechtliches</p>
        <h1>Impressum</h1>
        <p className="heroText">
          Informationen gemäß § 5 Digitale-Dienste-Gesetz (DDG) und § 18 Abs. 2 Medienstaatsvertrag (MStV).
        </p>
      </section>

      <section className="panel legalPanel">
        <div className="legalBlock">
          <p className="sectionKicker">Anbieterinformationen</p>
          <h2>Diensteanbieter</h2>
          <p>
            <strong>Ludwig-Maximilians-Universität München</strong>
            <br />
            Geschwister-Scholl-Platz 1
            <br />
            80539 München
            <br />
            Deutschland
          </p>
          <p>
            Die Ludwig-Maximilians-Universität München ist eine staatliche Einrichtung des Freistaates Bayern und eine
            rechtsfähige Personalkörperschaft des öffentlichen Rechts. Sie wird gesetzlich vertreten durch den Präsidenten
            Universitätsprofessor Dr. med. Dr. h.c. Matthias H. Tschöp.
          </p>
        </div>

        <div className="legalBlock">
          <h2>Projekt und technische Betreuung</h2>
          <p>
            <strong>Institute of Artificial Intelligence (AI) in Management</strong>
            <br />
            Prof. Stefan Feuerriegel
            <br />
            Ludwigstr. 28 / RG
            <br />
            80539 München
            <br />
            Deutschland
          </p>
        </div>

        <div className="legalBlock">
          <h2>Kontakt</h2>
          <p>
            Telefon: +49 89 2180-0
            <br />
            E-Mail: <ObfuscatedEmail reversedDomain="ed.nehcneum-inu.gnutlawrev" reversedLocalPart="elletstsop" />
            <br />
            Projektkontakt: <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="legeirreuef.nafets" />
          </p>
          <p>
            Für verschlüsselte Nachrichten stellt die LMU Informationen zur S/MIME-verschlüsselten Kommunikation und
            zum besonderen elektronischen Behördenpostfach bereit. Bitte nutzen Sie hierfür die Hinweise im zentralen
            LMU-Impressum.
          </p>
        </div>

        <div className="legalBlock">
          <h2>Zuständige Aufsichtsbehörde</h2>
          <p>
            Bayerisches Staatsministerium für Wissenschaft und Kunst
            <br />
            Salvatorstraße 2
            <br />
            80327 München
            <br />
            Website: <a href="https://www.stmwk.bayern.de" rel="noreferrer" target="_blank">www.stmwk.bayern.de</a>
          </p>
        </div>

        <div className="legalBlock">
          <h2>Umsatzsteuer-Identifikationsnummer</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE811205325</p>
        </div>

        <div className="legalBlock">
          <h2>Inhaltlich verantwortlich gemäß § 18 Abs. 2 MStV</h2>
          <p>
            Ludwig-Maximilians-Universität München
            <br />
            Herr Dr. Christoph Mülke, Vizepräsident für den Bereich der Wirtschafts- und Personalverwaltung
            <br />
            Geschwister-Scholl-Platz 1
            <br />
            80539 München
            <br />
            Deutschland
          </p>
          <p>
            Für projektbezogene Inhalte: Prof. Stefan Feuerriegel, Institute of Artificial Intelligence (AI) in Management,
            Ludwigstr. 28 / RG, 80539 München.
          </p>
        </div>

        <div className="legalBlock">
          <h2>Haftung für Inhalte</h2>
          <p>
            Die Inhalte dieser Website wurden mit angemessener Sorgfalt erstellt.
            Es wird jedoch keine Gewähr für Richtigkeit, Vollständigkeit oder Aktualität der Informationen übernommen.
          </p>
        </div>

        <div className="legalBlock">
          <h2>Verbraucherstreitbeilegung und OS-Plattform</h2>
          <p>
            Über dieses Webangebot werden keine Online-Kaufverträge oder Online-Dienstleistungsverträge mit Verbraucherinnen
            und Verbrauchern geschlossen. Die frühere EU-Online-Streitbeilegungsplattform wurde zum 20.07.2025 eingestellt;
            dieses Webangebot verweist daher nicht auf eine OS-Plattform.
          </p>
          <p>
            Wir werden nicht an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilnehmen und
            sind hierzu auch nicht verpflichtet.
          </p>
        </div>

        <div className="legalBlock">
          <h2>Weitere Hinweise</h2>
          <p>
            LLM SoccerArena ist ein experimentelles Benchmark- und Analyseprojekt.
            Die angezeigten Prognosen sind automatisch generierte Modellvorhersagen
            und stellen keine Wett-, Finanz- oder sonstige professionelle Beratung dar.
          </p>
          <p>
            Ergänzend gelten die Angaben im zentralen <a href="https://www.lmu.de/de/footer/impressum/index.html" rel="noreferrer" target="_blank">Impressum der LMU München</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
