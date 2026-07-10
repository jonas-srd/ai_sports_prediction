"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStandalonePage = pathname === "/coming-soon";

  if (isStandalonePage) {
    return children;
  }

  return (
    <>
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  );
}
