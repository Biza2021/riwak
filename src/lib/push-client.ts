export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);

  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function serializePushSubscription(subscription: PushSubscription) {
  const payload = subscription.toJSON();

  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    throw new Error("INVALID_SUBSCRIPTION");
  }

  return {
    endpoint: payload.endpoint,
    keys: {
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
    },
    userAgent: navigator.userAgent,
  };
}
