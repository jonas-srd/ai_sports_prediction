import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal Notice | World Cup LLM Rank",
  description: "Legal notice and provider information for World Cup LLM Rank."
};

export default function LegalNoticePage() {
  return (
    <main className="shell legalShell">
      <section className="hero compactHero">
        <p className="eyebrow">Legal</p>
        <h1>Legal Notice</h1>
        <p className="heroText">
          Provider information according to applicable legal disclosure requirements.
        </p>
      </section>

      <section className="panel legalPanel">
        <div className="legalBlock">
          <p className="sectionKicker">Provider Information</p>
          <h2>Website Operator</h2>
          <p>
            <strong>Prof. Stefan Feuerriegel</strong>
            <br />
            Head of Institute
            <br />
            Institute of Artificial Intelligence (AI) in Management
            <br />
            Ludwigstr. 28 / RG
            <br />
            80539 Munich
            <br />
            Germany
          </p>
        </div>

        <div className="legalBlock">
          <h2>Contact</h2>
          <p>
            Office address:
            <br />
            Ludwigstr. 28 / RG
            <br />
            80539 Munich
            <br />
            Germany
            <br />
            Email: available on request via the Institute of AI in Management
            <br />
            Office hours: by appointment
          </p>
        </div>

        <div className="legalBlock">
          <h2>Responsible for Content</h2>
          <p>
            Prof. Stefan Feuerriegel
            <br />
            Institute of Artificial Intelligence (AI) in Management
            <br />
            Geschwister-Scholl-Platz 1
            <br />
            80539 Munich
            <br />
            Germany
          </p>
        </div>

        <div className="legalBlock">
          <h2>Liability for Content</h2>
          <p>
            The content on this website has been prepared with reasonable care.
            However, no guarantee is provided for the accuracy, completeness, or
            timeliness of the information.
          </p>
        </div>

        <div className="legalBlock">
          <h2>Project Notice</h2>
          <p>
            World Cup LLM Rank is an experimental benchmark and analysis project.
            The displayed predictions are automatically generated model forecasts
            and do not constitute betting, financial, or other professional advice.
          </p>
        </div>
      </section>
    </main>
  );
}
