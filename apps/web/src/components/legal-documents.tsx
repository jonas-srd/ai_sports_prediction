import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { localizePath } from "@/lib/i18n";
import {
  WIDGET_DPA_VERSION,
  WIDGET_PRIVACY_VERSION,
  WIDGET_TERMS_VERSION
} from "@/lib/widget-legal-versions";
import { getWidgetSellerDetails } from "@/lib/widget-sales-config";

export function WidgetTermsDocument({ locale }: { locale: Locale }) {
  const seller = getWidgetSellerDetails();
  const de = locale === "de";
  return (
    <LegalShell
      eyebrow={de ? "B2B · Widget-Lizenz" : "B2B · Widget licence"}
      intro={de ? "Vertragsbedingungen für kostenpflichtige Publisher-Widgets." : "Contract terms for paid publisher widgets."}
      title={de ? "Widget-Lizenzbedingungen (AGB)" : "Widget licence terms"}
      version={WIDGET_TERMS_VERSION}
    >
      <LegalSection title={de ? "1. Anbieter, Geltungsbereich und Unternehmereigenschaft" : "1. Provider, scope and business customers"}>
        <p>{de
          ? `Anbieter ist ${seller.name}, handelnd unter ${seller.tradingName}, ${formatAddress(seller)}. Diese Bedingungen gelten ausschließlich gegenüber Unternehmern im Sinne des § 14 BGB, juristischen Personen des öffentlichen Rechts und öffentlich-rechtlichen Sondervermögen. Ein Vertragsschluss mit Verbrauchern ist ausgeschlossen. Abweichende Bedingungen des Kunden gelten nur nach ausdrücklicher Zustimmung in Textform.`
          : `The provider is ${seller.name}, trading as ${seller.tradingName}, ${formatAddress(seller)}. These terms apply only to entrepreneurs within the meaning of section 14 German Civil Code (BGB), public-law entities and special public-law funds. Consumer contracts are excluded. Customer terms apply only if expressly accepted in text form.`}</p>
      </LegalSection>
      <LegalSection title={de ? "2. Vertragsschluss und Vertragsunterlagen" : "2. Contract formation and records"}>
        <p>{de
          ? "Tarifdarstellung und Checkout sind eine Aufforderung zur Abgabe eines Angebots. Der Kunde gibt mit Abschluss des Stripe-Checkouts ein verbindliches Angebot ab. Der Vertrag kommt mit elektronischer Auftrags- beziehungsweise Aktivierungsbestätigung oder mit Freischaltung des Publisher-Zugangs zustande. Tarif, Preis, Abrechnungsintervall, Domain, Annahmezeitpunkt und Versionen dieser Bedingungen werden als Vertragsnachweis gespeichert."
          : "The plan display and checkout invite an offer. By completing Stripe Checkout, the customer makes a binding offer. The contract is formed when the provider sends an electronic order or activation confirmation or enables publisher access. The selected plan, price, billing interval, domain, acceptance time and document versions are stored as contract evidence."}</p>
      </LegalSection>
      <LegalSection title={de ? "3. Leistung und Nutzungsrecht" : "3. Service and licence"}>
        <p>{de
          ? "Für die Vertragsdauer erhält der Kunde ein einfaches, nicht ausschließliches, nicht übertragbares Recht, die vereinbarten Widgets auf den freigegebenen Domains einzubinden. Umfang, Formate, Modelle, Domains und Aufrufslimits ergeben sich aus dem gewählten Tarif. Quellcode, API-Schlüssel oder Daten dürfen nicht verkauft, unterlizenziert, öffentlich weitergegeben, automatisiert extrahiert, umgangen oder zur Erstellung eines konkurrierenden Datendienstes verwendet werden. Branding darf nur entfernt werden, wenn dies ausdrücklich Bestandteil des Tarifs ist."
          : "For the contract term, the customer receives a non-exclusive, non-transferable right to embed the agreed widgets on approved domains. Formats, models, domains and request limits follow the selected plan. Source code, API keys or data may not be sold, sublicensed, publicly disclosed, scraped, circumvented or used to build a competing data service. Branding may be removed only where expressly included in the plan."}</p>
      </LegalSection>
      <LegalSection title={de ? "4. Prognosen, Inhalte und Kundenpflichten" : "4. Predictions, content and customer duties"}>
        <p>{de
          ? "Sportprognosen sind statistische Einschätzungen und keine Garantie für ein Ergebnis, keine Wettberatung und keine Aufforderung zum Glücksspiel. Der Kunde muss Hinweise auf Prognosecharakter und Unsicherheit erhalten und darf Inhalte nicht irreführend verändern. Er hält Publisher-Key und Zugangsdaten geheim, meldet Missbrauch unverzüglich, nutzt nur freigegebene Domains und stellt die rechtmäßige Einbindung einschließlich eigener Datenschutz- und Cookie-Hinweise sicher."
          : "Sports predictions are statistical assessments, not guaranteed outcomes, betting advice or an invitation to gamble. The customer must preserve notices about uncertainty and may not present content misleadingly. The customer keeps publisher credentials confidential, reports misuse promptly, uses approved domains only and ensures lawful embedding, including its own privacy and cookie information."}</p>
      </LegalSection>
      <LegalSection title={de ? "5. Verfügbarkeit, Änderungen und Support" : "5. Availability, changes and support"}>
        <p>{de
          ? "Der Anbieter betreibt den Dienst mit angemessener technischer Sorgfalt. Wartung, Sicherheitsmaßnahmen, Datenanbieter-Ausfälle, Sportplanänderungen und höhere Gewalt können die Verfügbarkeit beeinträchtigen. Ein bestimmtes SLA gilt nur bei ausdrücklicher Enterprise-Vereinbarung. Technisch oder rechtlich notwendige Änderungen sind zulässig, soweit Kernleistung und berechtigte Interessen des Kunden gewahrt bleiben."
          : "The provider operates the service with reasonable technical care. Maintenance, security measures, upstream data outages, schedule changes and force majeure may affect availability. A specific SLA applies only under an express Enterprise agreement. Technically or legally necessary changes are permitted where the core service and legitimate customer interests remain protected."}</p>
      </LegalSection>
      <LegalSection title={de ? "6. Preise, Umsatzsteuer, Zahlung und Rechnungen" : "6. Prices, tax, payment and invoices"}>
        <p>{de
          ? "Es gelten die im Checkout ausgewiesenen Preise. Bei Regelbesteuerung verstehen sie sich netto zuzüglich anwendbarer Umsatzsteuer; bei wirksamer Kleinunternehmerregelung wird keine Umsatzsteuer ausgewiesen. Grenzüberschreitende Steuerschuldnerschaft wird nur auf Grundlage prüfbarer Unternehmer- und USt-ID-Angaben angewandt. Zahlungen erfolgen über Stripe per SEPA-Lastschrift. Der Kunde erteilt das erforderliche Mandat und sorgt für Kontodeckung. Rechnungen werden elektronisch an die angegebene Rechnungs-E-Mail übermittelt; gesetzlich erforderliche strukturierte Rechnungsformate bleiben unberührt."
          : "Checkout prices apply. Under standard taxation they are net plus applicable VAT; where the German small-business scheme validly applies, no VAT is shown. Cross-border reverse charge is applied only on verifiable business and VAT-ID information. Stripe collects payment by SEPA Direct Debit. The customer provides the mandate and sufficient funds. Invoices are delivered electronically to the billing email; any mandatory structured invoice format remains unaffected."}</p>
      </LegalSection>
      <LegalSection title={de ? "7. Laufzeit, Verlängerung und Kündigung" : "7. Term, renewal and cancellation"}>
        <p>{de
          ? "Die Mindestlaufzeit beträgt zwölf Monate. Bei monatlicher Abrechnung sind zwölf Monatsentgelte geschuldet; bei jährlicher Abrechnung wird der im Checkout ausgewiesene Betrag für die ersten zwölf Monate im Voraus fällig. Nach der Mindestlaufzeit verlängert sich der Vertrag automatisch jeweils um einen Monat zum dann geltenden monatlichen Tarif. Er kann danach mit Wirkung zum Ende des jeweiligen monatlichen Abrechnungszeitraums gekündigt werden. Eine während der Mindestlaufzeit erklärte ordentliche Kündigung wirkt zum Ende der Mindestlaufzeit. Kündigungen sind in Textform, insbesondere per E-Mail an die Anbieteradresse im Impressum, möglich. Das Recht zur außerordentlichen Kündigung bleibt unberührt."
          : "The minimum term is twelve months. Monthly billing commits the customer to twelve monthly charges; annual billing charges the checkout amount for the first twelve months in advance. After the minimum term, the contract renews automatically one month at a time at the then-current monthly rate and may be cancelled at the end of each monthly billing period. Ordinary cancellation during the minimum term takes effect at its end. Cancellation may be submitted in text form, including email to the address in the legal notice. Extraordinary termination rights remain unaffected."}</p>
      </LegalSection>
      <LegalSection title={de ? "8. Sperrung und Vertragsbeendigung" : "8. Suspension and termination"}>
        <p>{de
          ? "Bei Zahlungsverzug, Sicherheitsrisiken, missbräuchlicher Nutzung oder wesentlichen Vertragsverstößen darf der Anbieter den Zugang nach angemessener Abwägung vorübergehend sperren. Soweit zumutbar, erfolgt vorher eine Mitteilung und Gelegenheit zur Abhilfe. Nach Vertragsende endet das Nutzungsrecht; Widgets und Schlüssel sind zu entfernen beziehungsweise werden deaktiviert."
          : "The provider may temporarily suspend access after reasonable consideration in cases of late payment, security risks, misuse or material breach. Where reasonable, the customer receives prior notice and an opportunity to cure. On termination, the licence ends and widgets and credentials must be removed or are disabled."}</p>
      </LegalSection>
      <LegalSection title={de ? "9. Gewährleistung und Haftung" : "9. Warranty and liability"}>
        <p>{de
          ? "Es gelten die gesetzlichen Mängelrechte. Der Anbieter haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit, arglistigem Verschweigen, Garantieübernahme und zwingender gesetzlicher Haftung. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt; im Übrigen ist sie bei leichter Fahrlässigkeit ausgeschlossen. Datenquellen und Prognosen können trotz Kontrollen fehlerhaft oder verspätet sein."
          : "Statutory warranty rights apply. Liability is unlimited for intent, gross negligence, injury to life, body or health, fraudulent concealment, express guarantees and mandatory statutory liability. For slight negligence affecting an essential contractual duty, liability is limited to typical foreseeable loss; otherwise liability for slight negligence is excluded. Despite controls, source data and predictions can be inaccurate or delayed."}</p>
      </LegalSection>
      <LegalSection title={de ? "10. Datenschutz und Auftragsverarbeitung" : "10. Privacy and processing"}>
        <p>{de ? <>Die <Link href={localizePath("/privacy", locale)}>Datenschutzerklärung</Link> gilt für eigene Verarbeitungen des Anbieters. Soweit personenbezogene Daten im Auftrag des Kunden verarbeitet werden, gilt ergänzend der <Link href={localizePath("/data-processing", locale)}>Auftragsverarbeitungsvertrag</Link>.</> : <>The <Link href={localizePath("/privacy", locale)}>privacy notice</Link> applies to the provider&apos;s own processing. Where personal data is processed on behalf of the customer, the <Link href={localizePath("/data-processing", locale)}>data processing agreement</Link> additionally applies.</>}</p>
      </LegalSection>
      <LegalSection title={de ? "11. Schlussbestimmungen" : "11. Final provisions"}>
        <p>{de
          ? "Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Ist der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist München ausschließlicher Gerichtsstand; zwingende Gerichtsstände bleiben unberührt. Änderungen und Nebenabreden bedürfen mindestens der Textform, soweit keine strengere Form vorgeschrieben ist. Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam."
          : "German law applies, excluding the UN Convention on Contracts for the International Sale of Goods. If the customer is a merchant, public-law entity or special public-law fund, Munich is the exclusive venue, subject to mandatory venues. Amendments and side agreements require at least text form unless stricter form is mandatory. Invalid provisions do not affect the remainder of the contract."}</p>
      </LegalSection>
    </LegalShell>
  );
}

export function PrivacyDocument({ locale }: { locale: Locale }) {
  const seller = getWidgetSellerDetails();
  const de = locale === "de";
  return (
    <LegalShell eyebrow={de ? "Datenschutz" : "Privacy"} intro={de ? "Informationen nach Art. 13 und 14 DSGVO." : "Information under Articles 13 and 14 GDPR."} title={de ? "Datenschutzerklärung" : "Privacy notice"} version={WIDGET_PRIVACY_VERSION}>
      <LegalSection title={de ? "1. Verantwortlicher" : "1. Controller"}>
        <p>{seller.name}<br />{seller.tradingName}<br />{formatAddress(seller)}<br />E-Mail: <a href={`mailto:${seller.email}`}>{seller.email}</a></p>
      </LegalSection>
      <LegalSection title={de ? "2. Website, Sicherheits- und Serverprotokolle" : "2. Website, security and server logs"}>
        <p>{de
          ? "Beim Aufruf verarbeiten wir IP-Adresse, Zeitpunkt, Zieladresse, Referrer, Browser-/Geräteangaben, Statuscode und technische Sicherheitsmerkmale, um Website und API auszuliefern, Angriffe abzuwehren und Fehler zu untersuchen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; berechtigte Interessen sind sicherer und stabiler Betrieb. Sicherheitsprotokolle werden grundsätzlich nur so lange gespeichert, wie dies für Betrieb, Missbrauchsabwehr und Nachweis erforderlich ist."
          : "When the service is accessed, we process IP address, time, requested address, referrer, browser/device data, status code and security signals to deliver the website and API, prevent attacks and investigate errors. The legal basis is Article 6(1)(f) GDPR; our legitimate interests are secure and stable operation. Security logs are retained only as long as needed for operations, abuse prevention and evidence."}</p>
      </LegalSection>
      <LegalSection title={de ? "3. Cookies und Reichweitenmessung" : "3. Cookies and analytics"}>
        <p>{de ? <>Notwendige Cookies speichern insbesondere die Cookie-Auswahl und, im geschützten Adminbereich, die Sitzung. Google Analytics wird erst nach Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und § 25 TDDDG geladen. Die Einwilligung ist jederzeit unter <Link href={localizePath("/cookies", locale)}>Cookie-Einstellungen</Link> widerrufbar.</> : <>Necessary cookies store the cookie choice and, in the protected admin area, the session. Google Analytics loads only after consent under Article 6(1)(a) GDPR and applicable German cookie law. Consent can be withdrawn at any time in <Link href={localizePath("/cookies", locale)}>cookie settings</Link>.</>}</p>
      </LegalSection>
      <LegalSection title={de ? "4. Anfragen, Newsletter und Geschäftskontakte" : "4. Requests, newsletters and business contacts"}>
        <p>{de
          ? "Bei Kontaktanfragen verarbeiten wir Kontaktdaten, Inhalt, Zeitpunkt und Bearbeitungsstatus zur Vertragsanbahnung beziehungsweise Kommunikation (Art. 6 Abs. 1 lit. b oder lit. f DSGVO). Newsletterdaten werden auf Einwilligungsbasis verarbeitet und bis zum Widerruf beziehungsweise Ablauf von Nachweispflichten gespeichert. Geschäftliche Kontaktdaten aus öffentlich zugänglichen Quellen können zur gezielten B2B-Ansprache auf Grundlage berechtigter Interessen verarbeitet werden; Widersprüche werden beachtet."
          : "For enquiries we process contact data, content, time and handling status for pre-contractual steps or communication (Article 6(1)(b) or (f) GDPR). Newsletter data is processed by consent and retained until withdrawal or expiry of evidence obligations. Publicly available business contact data may be processed for targeted B2B outreach based on legitimate interests; objections are honoured."}</p>
      </LegalSection>
      <LegalSection title={de ? "5. Widget-Bestellung, Vertrag und Abrechnung" : "5. Widget orders, contract and billing"}>
        <p>{de
          ? "Wir verarbeiten Ansprechpartner, Unternehmen, Domain, Rechnungsanschrift, Rechnungs-E-Mail, USt-ID, Tarif, Vertrags- und Annahmenachweise, Zahlungsstatus, Rechnungen und Supportvorgänge zur Vertragsanbahnung und -durchführung (Art. 6 Abs. 1 lit. b DSGVO), zur Erfüllung steuer- und handelsrechtlicher Pflichten (Art. 6 Abs. 1 lit. c DSGVO) sowie zur Missbrauchs- und Anspruchsabwehr (Art. 6 Abs. 1 lit. f DSGVO). Pflichtangaben sind für Vertrag, Steuerberechnung und Rechnung erforderlich."
          : "We process contacts, company, domain, billing address, billing email, VAT ID, plan, contract acceptance evidence, payment status, invoices and support records to enter into and perform the contract (Article 6(1)(b) GDPR), meet tax and commercial obligations (Article 6(1)(c) GDPR), and prevent abuse or establish claims (Article 6(1)(f) GDPR). Required fields are necessary for the contract, tax calculation and invoicing."}</p>
      </LegalSection>
      <LegalSection title={de ? "6. Widget-Nutzung" : "6. Widget usage"}>
        <p>{de
          ? "Zur Prüfung von Publisher-Key, Domain, Tarif- und Aufruflimit verarbeiten wir Kundenkennung, freigegebene Domain, Zeitpunkt, Endpunkt, Widget-Typ und aggregierte Aufrufzahlen. Besucherprofile werden nicht erstellt. Technisch bedingt können IP-Adresse und Request-Header kurzfristig in Sicherheits- und Infrastrukturprotokollen erscheinen. Soweit dies im Auftrag des Publishers erfolgt, gilt der AVV."
          : "To verify publisher credentials, domains, plan and usage limits, we process customer identifier, approved domain, time, endpoint, widget type and aggregated request counts. We do not create visitor profiles. IP addresses and request headers may temporarily appear in security and infrastructure logs. Where this is processing on behalf of a publisher, the DPA applies."}</p>
      </LegalSection>
      <LegalSection title={de ? "7. Empfänger, Dienstleister und Drittlandtransfers" : "7. Recipients, providers and international transfers"}>
        <p>{de
          ? "Wir nutzen insbesondere Amazon Web Services (Hosting, Datenbank, Backups in der Region Frankfurt), Cloudflare (DNS, Sicherheits- und Netzwerkdienste), Stripe (Checkout, SEPA, Steuern und Rechnungen), Resend (transaktionale E-Mails) und nach Einwilligung Google Analytics. Dienstleister erhalten nur erforderliche Daten und werden datenschutzrechtlich gebunden. Bei Transfers außerhalb EU/EWR stützen wir uns je nach Anbieter auf Angemessenheitsbeschlüsse, einschließlich EU-US Data Privacy Framework, oder EU-Standardvertragsklauseln und zusätzliche Schutzmaßnahmen."
          : "We use Amazon Web Services (hosting, database and backups in Frankfurt), Cloudflare (DNS, security and network services), Stripe (Checkout, SEPA, tax and invoices), Resend (transactional email) and, after consent, Google Analytics. Providers receive only necessary data and are contractually bound. Transfers outside the EU/EEA rely, as applicable, on adequacy decisions including the EU-US Data Privacy Framework, or EU Standard Contractual Clauses and supplementary safeguards."}</p>
      </LegalSection>
      <LegalSection title={de ? "8. Speicherdauer" : "8. Retention"}>
        <p>{de
          ? "Wir löschen Daten, wenn Zweck und Rechtsgrund entfallen. Nicht abgeschlossene Vertriebsanfragen werden regelmäßig überprüft und grundsätzlich nach spätestens 24 Monaten gelöscht, sofern keine weitere Rechtsgrundlage besteht. Vertrags-, Buchungs- und Rechnungsdaten werden entsprechend anwendbarer handels- und steuerrechtlicher Fristen regelmäßig sechs, acht oder zehn Jahre aufbewahrt. Vertragsannahmen und Nachweise können bis zum Ablauf möglicher Ansprüche gespeichert werden. Backups werden rollierend gelöscht."
          : "We delete data when its purpose and legal basis end. Unconverted sales enquiries are reviewed and generally deleted within 24 months unless another legal basis applies. Contract, accounting and invoice data is retained for applicable commercial and tax periods, commonly six, eight or ten years. Contract acceptance evidence may be retained until potential claims expire. Backups are deleted on a rolling basis."}</p>
      </LegalSection>
      <LegalSection title={de ? "9. Rechte betroffener Personen" : "9. Your rights"}>
        <p>{de
          ? "Betroffene Personen haben nach Maßgabe der DSGVO Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie auf Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft. Außerdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde, insbesondere der für Bayern zuständigen Behörde. Zur Ausübung genügt eine E-Mail an die oben genannte Adresse."
          : "Subject to the GDPR, individuals have rights of access, rectification, erasure, restriction, portability and objection, and may withdraw consent for the future. They may also complain to a data protection supervisory authority, particularly the competent Bavarian authority. Emailing the address above is sufficient to exercise rights."}</p>
      </LegalSection>
      <LegalSection title={de ? "10. Automatisierte Entscheidungen und Aktualisierung" : "10. Automated decisions and updates"}>
        <p>{de
          ? "Es findet keine ausschließlich automatisierte Entscheidung mit rechtlicher oder ähnlich erheblicher Wirkung statt. Sportprognosen beziehen sich nicht auf Personen als Betroffene im datenschutzrechtlichen Entscheidungssinn. Wir aktualisieren diese Erklärung bei Änderungen von Verarbeitung oder Rechtslage; maßgeblich ist die oben genannte Version."
          : "No solely automated decision with legal or similarly significant effect is made. Sports predictions are not decisions about data subjects in this sense. We update this notice when processing or law changes; the version above controls."}</p>
      </LegalSection>
    </LegalShell>
  );
}

export function DataProcessingDocument({ locale }: { locale: Locale }) {
  const seller = getWidgetSellerDetails();
  const de = locale === "de";
  return (
    <LegalShell eyebrow={de ? "Art. 28 DSGVO" : "Article 28 GDPR"} intro={de ? "Auftragsverarbeitungsvertrag für eingebettete Publisher-Widgets." : "Data processing agreement for embedded publisher widgets."} title={de ? "Auftragsverarbeitungsvertrag (AVV)" : "Data processing agreement (DPA)"} version={WIDGET_DPA_VERSION}>
      <LegalSection title={de ? "1. Parteien und Anwendungsbereich" : "1. Parties and scope"}>
        <p>{de
          ? `Dieser AVV wird zwischen dem Widget-Kunden als Verantwortlichem und ${seller.name}, ${seller.tradingName}, ${formatAddress(seller)}, als Auftragsverarbeiter geschlossen. Er gilt nur, soweit der Anbieter bei Auslieferung, Betrieb oder Support der Widgets personenbezogene Daten im Auftrag des Kunden verarbeitet, und ergänzt den Hauptvertrag.`
          : `This DPA is concluded between the widget customer as controller and ${seller.name}, ${seller.tradingName}, ${formatAddress(seller)}, as processor. It applies only where the provider processes personal data on the customer's behalf when delivering, operating or supporting the widgets, and supplements the main agreement.`}</p>
      </LegalSection>
      <LegalSection title={de ? "2. Gegenstand, Dauer, Art und Zweck" : "2. Subject, duration, nature and purpose"}>
        <p>{de
          ? "Gegenstand ist die technische Auslieferung und Absicherung der eingebetteten Widgets, Domain- und Zugangsprüfung, Limitmessung, Fehleranalyse und Support. Die Verarbeitung umfasst automatisiertes Empfangen, Übertragen, kurzfristiges Protokollieren, Aggregieren, Einschränken und Löschen. Sie dauert für die Laufzeit des Hauptvertrags zuzüglich technisch und gesetzlich erforderlicher Abwicklungs- und Löschfristen."
          : "The processing covers technical delivery and security of embedded widgets, domain and access verification, usage metering, error analysis and support. Operations include automated receipt, transmission, short-term logging, aggregation, restriction and deletion. Processing lasts for the main contract term plus technically and legally required wind-down and deletion periods."}</p>
      </LegalSection>
      <LegalSection title={de ? "3. Daten und betroffene Personen" : "3. Data and data subjects"}>
        <p>{de
          ? "Betroffene können Besucher und Nutzer der Publisher-Websites sowie Ansprechpartner des Kunden sein. Verarbeitet werden können IP-Adresse, Zeitstempel, Request-URL, Referrer beziehungsweise Origin, Browser-/Geräte- und Sicherheitsinformationen, Fehlerdaten, Supportinhalte und kundenbezogene Nutzungszähler. Besondere Kategorien nach Art. 9 DSGVO und Daten zu Straftaten sind nicht vorgesehen und dürfen nicht übermittelt werden."
          : "Data subjects may include visitors and users of publisher websites and customer contacts. Data may include IP address, timestamp, request URL, referrer or origin, browser/device and security data, errors, support content and customer-level usage counters. Special-category or criminal-offence data is not intended and must not be submitted."}</p>
      </LegalSection>
      <LegalSection title={de ? "4. Weisungen und Pflichten des Kunden" : "4. Instructions and customer duties"}>
        <p>{de
          ? "Der Anbieter verarbeitet Daten nur auf dokumentierte Weisung, soweit keine gesetzliche Pflicht entgegensteht. Hauptvertrag, Widget-Konfiguration, Supportanfragen und schriftliche Weisungen bilden die Weisungen. Der Anbieter weist auf erkennbar rechtswidrige Weisungen hin und darf deren Ausführung bis zur Klärung aussetzen. Der Kunde ist für Rechtsgrundlage, Transparenz, Betroffenenrechte, zulässige Einbindung und Datenminimierung verantwortlich."
          : "The provider processes data only on documented instructions unless required by law. The main agreement, widget settings, support requests and written instructions constitute instructions. The provider flags apparently unlawful instructions and may suspend them pending clarification. The customer is responsible for legal basis, transparency, data-subject rights, lawful embedding and data minimisation."}</p>
      </LegalSection>
      <LegalSection title={de ? "5. Vertraulichkeit und Sicherheit" : "5. Confidentiality and security"}>
        <p>{de
          ? "Zugriffsberechtigte Personen sind auf Vertraulichkeit verpflichtet und erhalten nur erforderliche Rechte. Die technischen und organisatorischen Maßnahmen umfassen insbesondere TLS-Verschlüsselung, verschlüsselte Datenträger und Backups, rollen- und schlüsselbasierte Zugriffe, Mehrfaktor- beziehungsweise Authenticator-Schutz für Administration, getrennte Produktionsdienste, Secrets-Verwaltung, Domain- und Tarifkontrollen, Protokollierung, Alarmierung, regelmäßige Datensicherung mit Wiederherstellungstest, Patch- und Schwachstellenmanagement sowie Lösch- und Berechtigungskonzepte."
          : "Authorised personnel are bound to confidentiality and receive least-privilege access. Technical and organisational measures include TLS, encrypted storage and backups, role- and key-based access, multi-factor/authenticator protection for administration, separated production services, secret management, domain and plan controls, logging, alerting, regular backups with restore testing, patch and vulnerability management, and deletion and access-control concepts."}</p>
      </LegalSection>
      <LegalSection title={de ? "6. Unterauftragsverarbeiter" : "6. Sub-processors"}>
        <p>{de
          ? "Der Kunde erteilt eine allgemeine Genehmigung für die folgenden Unterauftragsverarbeiter: Amazon Web Services EMEA SARL (Hosting, Datenbank, Backups; primäre Region Frankfurt) und Cloudflare, Inc. beziehungsweise verbundene EU-Gesellschaften (DNS, Netzwerk, DDoS- und Sicherheitsdienste; globale Edge-Infrastruktur). Gleichwertige Datenschutzpflichten werden vertraglich weitergegeben. Über beabsichtigte wesentliche Änderungen wird grundsätzlich mindestens 30 Tage vorher elektronisch oder durch Veröffentlichung informiert; der Kunde kann aus wichtigem Datenschutzgrund widersprechen."
          : "The customer gives general authorisation for these sub-processors: Amazon Web Services EMEA SARL (hosting, database, backups; primary Frankfurt region) and Cloudflare, Inc. or relevant EU affiliates (DNS, network, DDoS and security; global edge infrastructure). Equivalent obligations are contractually passed on. Material intended changes are generally notified electronically or by publication at least 30 days in advance; the customer may object on substantial data-protection grounds."}</p>
      </LegalSection>
      <LegalSection title={de ? "7. Unterstützung, Vorfälle und Kontrollen" : "7. Assistance, incidents and audits"}>
        <p>{de
          ? "Der Anbieter unterstützt den Kunden unter Berücksichtigung der Art der Verarbeitung bei Betroffenenanfragen, Datenschutz-Folgenabschätzungen und Behördenkontakten. Verletzungen des Schutzes auftragsverarbeiteter Daten werden dem Kunden unverzüglich nach Bekanntwerden mit den verfügbaren Angaben gemeldet. Der Anbieter stellt auf Anfrage geeignete Nachweise bereit. Vor-Ort-Prüfungen erfolgen nach angemessener Vorankündigung, während Geschäftszeiten, unter Vertraulichkeit und ohne Beeinträchtigung anderer Kunden; unverhältnismäßiger Zusatzaufwand kann nach vorheriger Vereinbarung berechnet werden."
          : "Considering the nature of processing, the provider assists with data-subject requests, impact assessments and authority consultations. Breaches affecting commissioned data are reported without undue delay after discovery with available information. Appropriate evidence is provided on request. On-site audits require reasonable notice, business hours, confidentiality and protection of other customers; disproportionate extra work may be charged by prior agreement."}</p>
      </LegalSection>
      <LegalSection title={de ? "8. Drittlandübermittlungen" : "8. International transfers"}>
        <p>{de
          ? "Daten werden primär in der EU verarbeitet. Soweit globale Sicherheits- oder Supportleistungen einen Drittlandtransfer erfordern, erfolgt dieser nur unter den Voraussetzungen der Art. 44 ff. DSGVO, insbesondere auf Grundlage eines Angemessenheitsbeschlusses oder von Standardvertragsklauseln einschließlich erforderlicher Zusatzmaßnahmen."
          : "Data is primarily processed in the EU. Where global security or support requires an international transfer, it occurs only under Articles 44 et seq. GDPR, particularly an adequacy decision or Standard Contractual Clauses with necessary supplementary safeguards."}</p>
      </LegalSection>
      <LegalSection title={de ? "9. Rückgabe, Löschung und Rangfolge" : "9. Return, deletion and precedence"}>
        <p>{de
          ? "Nach Ende der Auftragsverarbeitung löscht oder gibt der Anbieter auftragsverarbeitete personenbezogene Daten nach Wahl des Kunden zurück, soweit keine gesetzliche Aufbewahrungspflicht besteht. Sicherheitskopien werden im regulären Löschzyklus überschrieben und bis dahin geschützt. Bei Widersprüchen geht dieser AVV für Datenschutzfragen dem Hauptvertrag vor; im Übrigen bleibt der Hauptvertrag maßgeblich."
          : "After commissioned processing ends, the provider deletes or returns commissioned personal data at the customer's choice unless retention is legally required. Backups are overwritten in the normal cycle and protected until then. This DPA prevails on data-protection matters; otherwise the main agreement controls."}</p>
      </LegalSection>
    </LegalShell>
  );
}

function LegalShell({ children, eyebrow, intro, title, version }: { children: React.ReactNode; eyebrow: string; intro: string; title: string; version: string }) {
  return (
    <main className="footballDetailShell sportschauFootballPage legalPageShell">
      <section className="competitionHero legalHero">
        <div className="sportschauCompetitionTitle">
          <p className="footballEyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro} · Version {version}</p>
        </div>
      </section>
      <section className="footballPanel legalPagePanel">{children}</section>
    </main>
  );
}

function LegalSection({ children, title }: { children: React.ReactNode; title: string }) {
  return <div className="legalPageBlock"><h2>{title}</h2>{children}</div>;
}

function formatAddress(seller: ReturnType<typeof getWidgetSellerDetails>): string {
  return [seller.street, `${seller.postalCode} ${seller.city}`.trim(), seller.country].filter(Boolean).join(", ");
}
