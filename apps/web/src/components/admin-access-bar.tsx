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
        <Link aria-current={pathname === "/admin" ? "page" : undefined} href="/admin">Übersicht</Link>
        <Link aria-current={pathname.startsWith("/admin/revenue") ? "page" : undefined} href="/admin/revenue">Umsatz</Link>
        <Link aria-current={pathname.startsWith("/admin/marketing") ? "page" : undefined} href="/admin/marketing">Marketing</Link>
        <Link aria-current={pathname.startsWith("/admin/outreach") ? "page" : undefined} href="/admin/outreach">Outreach</Link>
        <Link aria-current={pathname.startsWith("/admin/data-quality") ? "page" : undefined} href="/admin/data-quality">Datenqualität</Link>
        <Link aria-current={pathname.startsWith("/admin/customers") ? "page" : undefined} href="/admin/customers">Widget-Kunden</Link>
        <Link aria-current={pathname.startsWith("/admin/leads") ? "page" : undefined} href="/admin/leads">Leads</Link>
      </nav>
      <button type="button" onClick={logout}>Abmelden</button>
    </div>
  );
}
