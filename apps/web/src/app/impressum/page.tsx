import type { Metadata } from "next";
import { ObfuscatedEmail } from "@/components/obfuscated-email";

export const metadata: Metadata = {
  title: "Legal Notice | AI Sport Prediction",
  description: "Legal notice and provider information for AI Sport Prediction."
};

const contactEmail = <ObfuscatedEmail reversedDomain="moc.kooltuo" reversedLocalPart="noitciderp-trops-ia" />;

export default function LegalNoticePage() {
  return (
    <main className="footballDetailShell sportschauFootballPage legalPageShell">
      <section className="competitionHero legalHero">
        <div className="sportschauCompetitionTitle">
          <p className="footballEyebrow">Legal</p>
          <h1>Legal Notice</h1>
          <p>Contact and provider information for AI Sport Prediction.</p>
        </div>
      </section>

      <section className="footballPanel legalPagePanel" aria-labelledby="legal-title">
        <div className="sportschauSectionTitle">
          <span>AI Sport Prediction</span>
          <h2 id="legal-title">Legal Notice</h2>
        </div>

        <div className="legalPageBlock">
          <h2>Information pursuant to Section 5 DDG</h2>
          <p>
            Jonas Schröder
            <br />
            AI Sport Prediction
            <br />
            80469 Munich
            <br />
            Germany
            <br />
            Postal address upon request: {contactEmail}
          </p>
        </div>

        <div className="legalPageBlock">
          <h2>Contact</h2>
          <p>Email: {contactEmail}</p>
        </div>

        <div className="legalPageBlock">
          <h2>Responsible for content under Section 18(2) MStV</h2>
          <p>Jonas Schröder (address as above)</p>
        </div>

        <div className="legalPageBlock">
          <h2>EU dispute resolution</h2>
          <p>
            The European Commission no longer provides an online dispute resolution platform.
            We are not willing or obliged to participate in dispute resolution proceedings before
            a consumer arbitration board.
          </p>
        </div>

        <div className="legalPageBlock">
          <h2>Liability for content</h2>
          <p>
            As a service provider, we are responsible for our own content on these pages in accordance
            with general law. Under Sections 8 to 10 DDG, however, we are not obliged to monitor
            transmitted or stored third-party information.
          </p>
        </div>
      </section>
    </main>
  );
}
