"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { GlobalPredictionModelBar } from "@/components/prediction-model-selector";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStandalonePage = pathname === "/coming-soon" || pathname.startsWith("/admin/");
  const showFullSite = process.env.NEXT_PUBLIC_SHOW_FULL_SITE === "1";

  if (!showFullSite || isStandalonePage) {
    return children;
  }

  return (
    <>
      <SiteNav />
      <GlobalPredictionModelBar />
      {children}
      <SiteFooter />
    </>
  );
}
