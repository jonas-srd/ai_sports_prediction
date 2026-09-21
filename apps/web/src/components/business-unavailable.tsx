import type { Locale } from "@/lib/i18n";

export function BusinessUnavailable({ locale = "en" }: { locale?: Locale }) {
  return (
    <section className="widgetsPanel" role="status">
      <h2>{locale === "de" ? "Derzeit nicht verfügbar" : "Temporarily unavailable"}</h2>
      <p>{locale === "de"
        ? "Newsletter-Anmeldung, Widget-Bestellungen und Kundenkonten sind vorübergehend deaktiviert. Sportdaten und Prognosen bleiben verfügbar."
        : "Newsletter signup, widget orders and customer accounts are temporarily disabled. Sports data and predictions remain available."}</p>
    </section>
  );
}
