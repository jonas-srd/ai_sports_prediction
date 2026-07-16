"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import styles from "./widget-customer-portal.module.css";

export function WidgetCustomerLogin({ locale }: { locale: Locale }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const german = locale === "de";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    await fetch("/api/widgets/account/auth/request", {
      body: JSON.stringify({ email, locale }),
      headers: { "content-type": "application/json" },
      method: "POST"
    }).catch(() => undefined);
    setBusy(false);
    setSent(true);
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <span>{german ? "Kundenbereich" : "Customer account"}</span>
        <h1>{german ? "Sicher anmelden" : "Secure sign-in"}</h1>
        <p>{german
          ? "Wir senden einen einmaligen Anmeldelink an die E-Mail-Adresse Ihres Widget-Vertrags."
          : "We send a one-time sign-in link to the email address on your widget contract."}</p>
        {sent ? (
          <div className={styles.notice}>{german
            ? "Falls ein aktives Konto existiert, ist der Anmeldelink unterwegs. Er ist 20 Minuten gültig."
            : "If an active account exists, the sign-in link is on its way. It is valid for 20 minutes."}</div>
        ) : (
          <form onSubmit={submit}>
            <label>
              {german ? "Vertrags-E-Mail-Adresse" : "Contract email address"}
              <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <button disabled={busy} type="submit">{busy
              ? (german ? "Wird gesendet…" : "Sending…")
              : (german ? "Anmeldelink senden" : "Send sign-in link")}</button>
          </form>
        )}
        <small>{german
          ? "Kein Passwort nötig. Der Link kann nur einmal verwendet werden."
          : "No password required. The link can only be used once."}</small>
      </section>
    </main>
  );
}
