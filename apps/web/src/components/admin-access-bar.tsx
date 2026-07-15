"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin-access-bar.module.css";

export function AdminAccessBar() {
  const pathname = usePathname();
  if (pathname === "/admin/login") {
    return null;
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/admin/login");
  }

  return (
    <div className={styles.bar}>
      <span className={styles.lock}>● PRIVATE</span>
      <nav aria-label="Admin-Navigation">
        <Link href="/admin/marketing">Marketing</Link>
        <Link href="/admin/outreach">Outreach</Link>
      </nav>
      <button type="button" onClick={logout}>Abmelden</button>
    </div>
  );
}
