"use client";

import { useEffect, useState } from "react";

import { Notice, SecondaryButton } from "./ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt({
  title,
  body,
  iosHint,
}: {
  title: string;
  body: string;
  iosHint: string;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (!isStandalone) {
      const timer = window.setTimeout(() => {
        setVisible(true);
      }, 0);

      return () => {
        window.clearTimeout(timer);
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        );
      };
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  if (!visible || dismissed) {
    return null;
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setVisible(false);
      return;
    }

    setVisible(false);
  }

  return (
    <Notice title={title}>
      <div className="space-y-3">
        <p>{body}</p>
        <p className="text-xs leading-5 opacity-80">{iosHint}</p>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={handleInstall}>
            Ajouter
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setDismissed(true)}>
            Fermer
          </SecondaryButton>
        </div>
      </div>
    </Notice>
  );
}
