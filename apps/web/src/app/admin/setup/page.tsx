import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { buildTotpUri, getAdminTotpSecrets } from "@/lib/admin-totp";
import styles from "./setup.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Authenticator Setup | AI Sports Prediction",
  robots: { index: false, follow: false }
};

export default async function AdminAuthenticatorSetupPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const entries = await Promise.all([...getAdminTotpSecrets()].map(async ([email, secret]) => ({
    email,
    qrCode: await QRCode.toDataURL(buildTotpUri(email, secret), {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320
    }),
    secret
  })));

  return (
    <main className={styles.page}>
      <header>
        <div className={styles.eyebrow}>LOCAL SETUP ONLY</div>
        <h1>Authenticator einrichten</h1>
        <p>Jede Person scannt ausschließlich den eigenen QR-Code. Diese Seite ist in Produktion deaktiviert.</p>
      </header>
      <section className={styles.grid}>
        {entries.map((entry) => (
          <article className={styles.card} key={entry.email}>
            <h2>{entry.email}</h2>
            <img src={entry.qrCode} alt={`Authenticator QR-Code für ${entry.email}`} width="320" height="320" />
            <p>Google Authenticator, Microsoft Authenticator oder 1Password öffnen und den QR-Code scannen.</p>
            <details>
              <summary>Manuellen Schlüssel anzeigen</summary>
              <code>{entry.secret}</code>
            </details>
          </article>
        ))}
      </section>
      <aside>Die QR-Codes und Schlüssel sind Zugangsdaten. Nicht öffentlich teilen oder in Screenshots außerhalb eures Teams speichern.</aside>
    </main>
  );
}
