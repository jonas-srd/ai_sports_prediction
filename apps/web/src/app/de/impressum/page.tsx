import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum | LLM SoccerArena",
  description: "Impressum und Anbieterinformationen fur LLM SoccerArena."
};

export default function GermanLegalNoticePage() {
  return (
    <main className="shell legalShell">
      <section className="hero compactHero">
        <p className="eyebrow">Rechtliches</p>
        <h1>Impressum</h1>
        <p className="heroText">
          Anbieterinformationen gemaess den geltenden Offenlegungspflichten.
        </p>
      </section>

      <section className="panel legalPanel">
        <div className="legalBlock">
          <p className="sectionKicker">Anbieterinformationen</p>
          <h2>Website-Betreiber</h2>
          <p>
            <strong>Prof. Stefan Feuerriegel</strong>
            <br />
            Institutsleiter
            <br />
            Institute of Artificial Intelligence (AI) in Management
            <br />
            Ludwigstr. 28 / RG
            <br />
            80539 Munchen
            <br />
            Deutschland
          </p>
        </div>

        <div className="legalBlock">
          <h2>Kontakt</h2>
          <p>
            Buroadresse:
            <br />
            Ludwigstr. 28 / RG
            <br />
            80539 Munchen
            <br />
            Deutschland
            <br />
            E-Mail: auf Anfrage uber das Institute of AI in Management
            <br />
            Sprechzeiten: nach Vereinbarung
          </p>
        </div>

        <div className="legalBlock">
          <h2>Verantwortlich fur den Inhalt</h2>
          <p>
            Prof. Stefan Feuerriegel
            <br />
            Institute of Artificial Intelligence (AI) in Management
            <br />
            Geschwister-Scholl-Platz 1
            <br />
            80539 Munchen
            <br />
            Deutschland
          </p>
        </div>

        <div className="legalBlock">
          <h2>Haftung fur Inhalte</h2>
          <p>
            Die Inhalte dieser Website wurden mit angemessener Sorgfalt erstellt.
            Es wird jedoch keine Gewahr fur Richtigkeit, Vollstandigkeit oder Aktualitat der Informationen ubernommen.
          </p>
        </div>

        <div className="legalBlock">
          <h2>Projekthinweis</h2>
          <p>
            LLM SoccerArena ist ein experimentelles Benchmark- und Analyseprojekt.
            Die angezeigten Prognosen sind automatisch generierte Modellvorhersagen
            und stellen keine Wett-, Finanz- oder sonstige professionelle Beratung dar.
          </p>
        </div>
      </section>
    </main>
  );
}

