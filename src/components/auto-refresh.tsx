"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshMode = "router" | "reload";

export function AutoRefresh({
  intervalMs = 15000,
  mode = "router",
}: {
  intervalMs?: number;
  mode?: AutoRefreshMode;
}) {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    lastRefreshAtRef.current = Date.now();

    const refreshNow = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      const now = Date.now();
      if (now - lastRefreshAtRef.current < 1000) {
        return;
      }

      lastRefreshAtRef.current = now;

      if (mode === "reload") {
        window.location.reload();
        return;
      }

      router.refresh();
    };

    const timer = window.setInterval(() => {
      refreshNow();
    }, intervalMs);

    const handleFocus = () => {
      refreshNow();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshNow();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs, mode, router]);

  return null;
}
