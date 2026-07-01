import type { Metadata } from "next";
import { ObfuscatedEmail } from "@/components/obfuscated-email";

export const metadata: Metadata = {
  title: "Legal Notice | AI Sports Prediction",
  description: "Legal notice and provider information for AI Sports Prediction."
};

export default function LegalNoticePage() {
  return (
    <main className="shell legalShell">
      <section className="hero compactHero">
        <p className="eyebrow">Legal</p>
        <h1>Legal Notice</h1>
        <p className="heroText">
          Provider information pursuant to Section 5 German Digital Services Act (DDG) and Section 18(2) German Interstate Media Treaty (MStV).
        </p>
      </section>

      <section className="panel legalPanel">
        <div className="legalBlock">
          <p className="sectionKicker">Provider Information</p>
          <h2>Service Provider</h2>
          <p>
            <strong>Ludwig-Maximilians-Universität München</strong>
            <br />
            Geschwister-Scholl-Platz 1
            <br />
            80539 Munich
            <br />
            Germany
          </p>
          <p>
            Ludwig-Maximilians-Universität München is a state institution of the Free State of Bavaria and a legal
            corporation under public law. It is legally represented by its President, Universitätsprofessor Dr. med.
            Dr. h.c. Matthias H. Tschöp.
          </p>
        </div>

        <div className="legalBlock">
          <h2>Project and Technical Contact</h2>
          <p>
            <strong>Institute of Artificial Intelligence (AI) in Management</strong>
            <br />
            Prof. Stefan Feuerriegel
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
            Phone: +49 89 2180-0
            <br />
            Email: <ObfuscatedEmail reversedDomain="ed.nehcneum-inu.gnutlawrev" reversedLocalPart="elletstsop" />
            <br />
            Project contact: <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="legeirreuef" />
          </p>
          <p>
            For encrypted communication, LMU provides information on S/MIME-encrypted communication and the special
            electronic authority mailbox. Please refer to the central LMU legal notice for these details.
          </p>
        </div>

        <div className="legalBlock">
          <h2>Responsible Supervisory Authority</h2>
          <p>
            Bavarian State Ministry of Science and the Arts
            <br />
            Salvatorstraße 2
            <br />
            80327 Munich
            <br />
            Website: <a href="https://www.stmwk.bayern.de" rel="noreferrer" target="_blank">www.stmwk.bayern.de</a>
          </p>
        </div>

        <div className="legalBlock">
          <h2>VAT Identification Number</h2>
          <p>VAT identification number pursuant to Section 27a German VAT Act: DE811205325</p>
        </div>

        <div className="legalBlock">
          <h2>Person Responsible for Content under Section 18(2) MStV</h2>
          <p>
            Ludwig-Maximilians-Universität München
            <br />
            Dr. Christoph Mülke, Vice President for Economic and Personnel Administration
            <br />
            Geschwister-Scholl-Platz 1
            <br />
            80539 Munich
            <br />
            Germany
          </p>
          <p>
            For project-specific content: Prof. Stefan Feuerriegel, Institute of Artificial Intelligence (AI) in Management,
            Ludwigstr. 28 / RG, 80539 Munich.
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
          <h2>Consumer Dispute Resolution and OS Platform</h2>
          <p>
            This website does not conclude online purchase contracts or online service contracts with consumers.
            The former EU online dispute resolution platform was discontinued on July 20, 2025; this website therefore
            does not link to an OS platform.
          </p>
          <p>
            We will not participate in dispute resolution proceedings before a consumer arbitration board and are not
            obliged to do so.
          </p>
        </div>

        <div className="legalBlock">
          <h2>Additional Notice</h2>
          <p>
            AI Sports Prediction is an experimental benchmark and analysis project.
            The displayed predictions are automatically generated model forecasts
            and do not constitute betting, financial, or other professional advice.
          </p>
          <p>
            The information in the central <a href="https://www.lmu.de/de/footer/impressum/index.html" rel="noreferrer" target="_blank">LMU München legal notice</a> applies in addition.
          </p>
        </div>
      </section>
    </main>
  );
}
