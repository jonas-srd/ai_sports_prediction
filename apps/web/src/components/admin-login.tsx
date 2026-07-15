"use client";

import { FormEvent, useState } from "react";
import styles from "./admin-login.module.css";

export function AdminLogin({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/auth/verify-totp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code, next: nextPath })
      });
      const result = await response.json().catch(() => null) as { message?: string; redirectTo?: string } | null;
      if (response.ok && result?.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }
      setMessage(result?.message ?? "Die Anmeldung ist fehlgeschlagen.");
    } catch {
      setMessage("Die Anmeldung ist fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>PRIVATE COCKPIT</div>
        <h1>Admin-Anmeldung</h1>
        <p className={styles.intro}>Nur freigegebene Teammitglieder können Marketing und Outreach öffnen.</p>

        <form onSubmit={login} className={styles.form}>
          <label htmlFor="admin-email">E-Mail-Adresse</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            autoFocus
          />
          <label htmlFor="admin-code">Authenticator-Code</label>
          <input
            id="admin-code"
            className={styles.codeInput}
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            autoComplete="one-time-code"
            required
          />
          <button type="submit" disabled={busy || code.length !== 6 || !email}>
            {busy ? "Wird geprüft …" : "Sicher anmelden"}
          </button>
        </form>

        {message ? <p className={styles.message} role="status">{message}</p> : null}
        <p className={styles.security}>Der Code kommt aus deiner Authenticator-App und wechselt alle 30 Sekunden. Die Sitzung wird ausschließlich in einem sicheren Browser-Cookie gespeichert.</p>
      </section>
    </main>
  );
}
