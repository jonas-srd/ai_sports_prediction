"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { GlobalPredictionModelBar } from "@/components/prediction-model-selector";
import { PublicSiteTranslator } from "@/components/public-site-translator";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStandalonePage = pathname === "/coming-soon" || pathname.startsWith("/admin/");
  const [hasPrivatePreview, setHasPrivatePreview] = useState(false);
  const showFullSite = process.env.NEXT_PUBLIC_SHOW_FULL_SITE !== "0" || hasPrivatePreview;

  useEffect(() => {
    setHasPrivatePreview(document.cookie
      .split(";")
      .some((cookie) => cookie.trim() === "residual_full_site_preview=1"));
  }, [pathname]);

  if (!showFullSite || isStandalonePage) {
    return children;
  }

  return (
    <div className="publicSite">
      <SiteNav />
      <GlobalPredictionModelBar />
      <div className="publicSiteContent">{children}</div>
      <SiteFooter />
      <PublicSiteTranslator />
    </div>
  );
}
