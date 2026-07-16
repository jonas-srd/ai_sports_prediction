import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin-login";
import { isSafeAdminRedirect } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Admin Login | AI Sports Prediction",
  robots: { index: false, follow: false }
};

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AdminLogin nextPath={isSafeAdminRedirect(next) ? next : "/admin"} />;
}
