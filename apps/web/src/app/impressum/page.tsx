import type { Metadata } from "next";
import { ObfuscatedEmail } from "@/components/obfuscated-email";

export const metadata: Metadata = {
  title: "Legal Notice | AI Sports Prediction",
  description: "Legal notice and provider information for AI Sports Prediction."
};

const contactEmail = <ObfuscatedEmail reversedDomain="moc.kooltuo" reversedLocalPart="noitciderp-strops-ia" />;

export default function LegalNoticePage() {
  return (
    <main className="footballDetailShell sportschauFootballPage legalPageShell">
      <section className="competitionHero legalHero">
        <div className="sportschauCompetitionTitle">
          <p className="footballEyebrow">Legal</p>
          <h1>Legal notice</h1>
          <p>Contact and provider information for AI Sports Prediction.</p>
        </div>
      </section>

      <section className="footballPanel legalPagePanel" aria-labelledby="legal-title">
        <div className="sportschauSectionTitle">
          <span>AI Sports Prediction</span>
          <h2 id="legal-title">Legal notice</h2>
        </div>

        <div className="legalPageBlock">
          <h2>Information pursuant to § 5 DDG</h2>
          <p>
            Jonas Schröder
            <br />
            AI Sports Prediction
            <br />
            81541 Munich
            <br />
            Germany
            <br />
            Postal address on request: {contactEmail}
          </p>
        </div>

        <div className="legalPageBlock">
          <h2>Contact</h2>
          <p>Email: {contactEmail}</p>
        </div>

        <div className="legalPageBlock">
          <h2>Responsible for content pursuant to § 18 para. 2 MStV</h2>
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
            As a service provider, we are responsible for our own content on these pages in
            accordance with § 7 para. 1 DDG and general law. According to §§ 8 to 10 DDG, however,
            we are not obliged to monitor transmitted or stored third-party information.
          </p>
        </div>
      </section>
    </main>
  );
}
