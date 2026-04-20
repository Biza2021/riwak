"use client";

import { useEffect, useMemo, useState } from "react";

import { fr } from "@/content/fr";
import {
  serializePushSubscription,
  urlBase64ToUint8Array,
} from "@/lib/push-client";
import { Badge, Card, Notice, PrimaryButton, SecondaryButton } from "./ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = "checking" | "available" | "manual" | "complete" | "unavailable";
type NotificationState =
  | "checking"
  | "available"
  | "complete"
  | "unsupported"
  | "unavailable"
  | "denied";

const INSTALL_COMPLETED_KEY = "riwak.setup.install.completed.v1";
const SETUP_SNOOZE_UNTIL_KEY = "riwak.setup.snoozeUntil.v1";
const SETUP_SNOOZE_MS = 72 * 60 * 60 * 1000;

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function supportsManualIosInstall() {
  const userAgent = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);

  return isIos && isSafari && !isStandaloneMode();
}

function syncPushSubscription(subscription: PushSubscription) {
  return fetch("/api/push/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(serializePushSubscription(subscription)),
  });
}

export function CustomerSetupPrompt({
  forceOpen = false,
  vapidPublicKey,
}: {
  forceOpen?: boolean;
  vapidPublicKey: string;
}) {
  const [installState, setInstallState] = useState<InstallState>("checking");
  const [notificationState, setNotificationState] =
    useState<NotificationState>("checking");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [busyAction, setBusyAction] = useState<"install" | "notifications" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [snoozed, setSnoozed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncUrl = () => {
      if (!forceOpen) {
        return;
      }

      const nextUrl = new URL(window.location.href);
      if (!nextUrl.searchParams.has("setup")) {
        return;
      }

      nextUrl.searchParams.delete("setup");
      const search = nextUrl.searchParams.toString();
      window.history.replaceState(
        {},
        "",
        `${nextUrl.pathname}${search ? `?${search}` : ""}${nextUrl.hash}`,
      );
    };

    syncUrl();

    if (forceOpen) {
      setSnoozed(false);
      return;
    }

    const snoozeUntilRaw = window.localStorage.getItem(SETUP_SNOOZE_UNTIL_KEY);
    if (!snoozeUntilRaw) {
      setSnoozed(false);
      return;
    }

    const snoozeUntil = Number.parseInt(snoozeUntilRaw, 10);
    setSnoozed(Number.isFinite(snoozeUntil) && snoozeUntil > Date.now());
  }, [forceOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const markInstalled = () => {
      window.localStorage.setItem(INSTALL_COMPLETED_KEY, "1");
      window.localStorage.removeItem(SETUP_SNOOZE_UNTIL_KEY);
      setInstallState("complete");
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallState("available");
    };

    const handleAppInstalled = () => {
      markInstalled();
    };

    if (isStandaloneMode() || window.localStorage.getItem(INSTALL_COMPLETED_KEY) === "1") {
      setInstallState("complete");
    } else {
      setInstallState("checking");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const fallbackTimer = window.setTimeout(() => {
      setInstallState((current) => {
        if (current === "available" || current === "complete") {
          return current;
        }

        return supportsManualIosInstall() ? "manual" : "unavailable";
      });
    }, 900);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveNotificationState = async () => {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        if (!cancelled) {
          setNotificationState("unsupported");
        }
        return;
      }

      if (!vapidPublicKey.trim()) {
        if (!cancelled) {
          setNotificationState("unavailable");
        }
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) {
          setNotificationState("denied");
        }
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!cancelled) {
          setNotificationState(subscription ? "complete" : "available");
        }
      } catch {
        if (!cancelled) {
          setNotificationState("available");
        }
      }
    };

    void resolveNotificationState();

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  const showInstallStep = installState === "available" || installState === "manual";
  const showNotificationStep = notificationState === "available";

  const hasPendingSteps = useMemo(
    () => showInstallStep || showNotificationStep,
    [showInstallStep, showNotificationStep],
  );

  if (snoozed || !hasPendingSteps) {
    return null;
  }

  async function handleInstall() {
    if (busyAction || !deferredPrompt) {
      return;
    }

    setBusyAction("install");
    setError("");

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        window.localStorage.setItem(INSTALL_COMPLETED_KEY, "1");
        window.localStorage.removeItem(SETUP_SNOOZE_UNTIL_KEY);
        setInstallState("complete");
        setDeferredPrompt(null);
        return;
      }
    } finally {
      setBusyAction(null);
    }
  }

  function handleManualInstallComplete() {
    window.localStorage.setItem(INSTALL_COMPLETED_KEY, "1");
    window.localStorage.removeItem(SETUP_SNOOZE_UNTIL_KEY);
    setInstallState("complete");
  }

  async function handleEnableNotifications() {
    if (busyAction) {
      return;
    }

    setBusyAction("notifications");
    setError("");

    try {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setNotificationState("unsupported");
        return;
      }

      if (!vapidPublicKey.trim()) {
        setNotificationState("unavailable");
        return;
      }

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setNotificationState(permission === "denied" ? "denied" : "available");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const response = await syncPushSubscription(subscription);

      if (!response.ok) {
        throw new Error("SUBSCRIBE_FAILED");
      }

      window.localStorage.removeItem(SETUP_SNOOZE_UNTIL_KEY);
      setNotificationState("complete");
    } catch {
      setError(fr.notifications.errors.subscribeFailed);
    } finally {
      setBusyAction(null);
    }
  }

  function handleDismiss() {
    window.localStorage.setItem(
      SETUP_SNOOZE_UNTIL_KEY,
      String(Date.now() + SETUP_SNOOZE_MS),
    );
    setSnoozed(true);
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-[#8c6239]">{fr.setup.title}</p>
        <p className="text-sm leading-6 text-[#6d5644]">{fr.setup.body}</p>
      </div>

      {showInstallStep ? (
        <div className="space-y-3 rounded-2xl bg-[#f8f1e7] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#2d1b12]">{fr.setup.installTitle}</p>
              <p className="mt-1 text-sm leading-6 text-[#6d5644]">
                {fr.setup.installBody}
              </p>
            </div>
            <Badge tone="gold">1</Badge>
          </div>

          {installState === "manual" ? (
            <Notice tone="blue">{fr.setup.installManualHint}</Notice>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {installState === "available" ? (
              <PrimaryButton
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleInstall()}
              >
                <span className="inline-flex items-center gap-2">
                  {busyAction === "install" ? (
                    <span
                      aria-hidden="true"
                      className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                    />
                  ) : null}
                  <span>
                    {busyAction === "install" ? fr.common.loading : fr.actions.addToHome}
                  </span>
                </span>
              </PrimaryButton>
            ) : null}

            {installState === "manual" ? (
              <SecondaryButton type="button" onClick={handleManualInstallComplete}>
                {fr.setup.installDoneAction}
              </SecondaryButton>
            ) : null}
          </div>
        </div>
      ) : null}

      {showNotificationStep ? (
        <div className="space-y-3 rounded-2xl bg-[#f8f1e7] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#2d1b12]">
                {fr.setup.notificationsTitle}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#6d5644]">
                {fr.setup.notificationsBody}
              </p>
            </div>
            <Badge tone="blue">2</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              type="button"
              disabled={busyAction !== null}
              onClick={() => void handleEnableNotifications()}
            >
              <span className="inline-flex items-center gap-2">
                {busyAction === "notifications" ? (
                  <span
                    aria-hidden="true"
                    className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                  />
                ) : null}
                <span>
                  {busyAction === "notifications"
                    ? fr.notifications.pending
                    : fr.notifications.enable}
                </span>
              </span>
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {notificationState === "denied" ? (
        <Notice tone="blue">{fr.setup.notificationsDenied}</Notice>
      ) : null}

      {error ? <Notice tone="red">{error}</Notice> : null}

      <div className="flex justify-end">
        <SecondaryButton type="button" onClick={handleDismiss}>
          {fr.actions.dismiss}
        </SecondaryButton>
      </div>
    </Card>
  );
}
