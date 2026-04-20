"use client";

import { useEffect, useState } from "react";

import { fr } from "@/content/fr";
import {
  serializePushSubscription,
  urlBase64ToUint8Array,
} from "@/lib/push-client";
import { Card, Notice, PrimaryButton, SecondaryButton } from "./ui";

type NotificationPreferenceState =
  | "checking"
  | "unsupported"
  | "unavailable"
  | "idle"
  | "denied"
  | "subscribed";

type PushNotificationPreferencesProps = {
  title: string;
  description: string;
  enabledDescription: string;
  vapidPublicKey: string;
};

export function PushNotificationPreferences({
  title,
  description,
  enabledDescription,
  vapidPublicKey,
}: PushNotificationPreferencesProps) {
  const [state, setState] = useState<NotificationPreferenceState>("checking");
  const [busyAction, setBusyAction] = useState<"subscribe" | "unsubscribe" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const syncExistingSubscription = async (subscription: PushSubscription) => {
      await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serializePushSubscription(subscription)),
      }).catch(() => undefined);
    };

    const loadState = async () => {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        if (!cancelled) {
          setState("unsupported");
        }
        return;
      }

      if (!vapidPublicKey.trim()) {
        if (!cancelled) {
          setState("unavailable");
        }
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) {
          setState("denied");
        }
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          if (!cancelled) {
            setState("idle");
          }
          return;
        }

        await syncExistingSubscription(subscription);

        if (!cancelled) {
          setState("subscribed");
        }
      } catch {
        if (!cancelled) {
          setState("idle");
        }
      }
    };

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  const handleSubscribe = async () => {
    if (busyAction) {
      return;
    }

    setBusyAction("subscribe");
    setError("");

    try {
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setState("unsupported");
        return;
      }

      if (!vapidPublicKey.trim()) {
        setState("unavailable");
        return;
      }

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
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

      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serializePushSubscription(subscription)),
      });

      if (!response.ok) {
        throw new Error("SUBSCRIBE_FAILED");
      }

      setState("subscribed");
    } catch {
      setError(fr.notifications.errors.subscribeFailed);
    } finally {
      setBusyAction(null);
    }
  };

  const handleUnsubscribe = async () => {
    if (busyAction) {
      return;
    }

    setBusyAction("unsubscribe");
    setError("");

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);

        await subscription.unsubscribe().catch(() => false);
      }

      setState(Notification.permission === "denied" ? "denied" : "idle");
    } catch {
      setError(fr.notifications.errors.unsubscribeFailed);
    } finally {
      setBusyAction(null);
    }
  };

  const isPending = busyAction !== null;

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#8c6239]">{title}</p>
        <p className="text-sm leading-6 text-[#6d5644]">
          {state === "subscribed" ? enabledDescription : description}
        </p>
      </div>

      {state === "unsupported" ? (
        <Notice tone="blue">{fr.notifications.unsupported}</Notice>
      ) : null}

      {state === "unavailable" ? (
        <Notice tone="neutral">{fr.notifications.unavailable}</Notice>
      ) : null}

      {state === "denied" ? (
        <Notice tone="red">{fr.notifications.permissionDenied}</Notice>
      ) : null}

      {error ? <Notice tone="red">{error}</Notice> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <PrimaryButton
          type="button"
          disabled={
            isPending ||
            state === "checking" ||
            state === "unsupported" ||
            state === "unavailable" ||
            state === "subscribed"
          }
          className="w-full sm:flex-1"
          onClick={() => void handleSubscribe()}
        >
          <span className="inline-flex items-center gap-2">
            {busyAction === "subscribe" ? (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
              />
            ) : null}
            <span>
              {busyAction === "subscribe"
                ? fr.notifications.pending
                : fr.notifications.enable}
            </span>
          </span>
        </PrimaryButton>

        <SecondaryButton
          type="button"
          disabled={isPending || state === "checking" || state !== "subscribed"}
          className="w-full sm:flex-1"
          onClick={() => void handleUnsubscribe()}
        >
          <span className="inline-flex items-center gap-2">
            {busyAction === "unsubscribe" ? (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
              />
            ) : null}
            <span>
              {busyAction === "unsubscribe"
                ? fr.notifications.pending
                : fr.notifications.disable}
            </span>
          </span>
        </SecondaryButton>
      </div>
    </Card>
  );
}
