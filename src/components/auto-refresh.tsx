"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refreshNow = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      router.refresh();
    };

    const timer = window.setInterval(() => {
      refreshNow();
    }, intervalMs);

    window.addEventListener("focus", refreshNow);
    document.addEventListener("visibilitychange", refreshNow);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", refreshNow);
    };
  }, [intervalMs, router]);

  return null;
}
