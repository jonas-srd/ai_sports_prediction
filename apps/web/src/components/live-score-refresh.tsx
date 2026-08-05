"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LIVE_SCORE_REFRESH_MS = 60_000;

export function LiveScoreRefresh({ label }: { label?: string }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    const timer = window.setInterval(refresh, LIVE_SCORE_REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return label ? <p className="homeLiveRefresh"><span aria-hidden="true" />{label}</p> : null;
}
