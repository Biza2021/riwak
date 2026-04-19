import { Prisma, type NotificationKind } from "@prisma/client";
import webpush from "web-push";

import { prisma } from "./db";
import {
  buildCustomerOrderReadyNotification,
  buildCustomerRewardEarnedNotification,
  buildStaffNewOrderNotification,
  type PushNotificationPayload,
} from "./push-notification-payloads";

const WEB_PUSH_PUBLIC_KEY = process.env.WEB_PUSH_PUBLIC_KEY?.trim() ?? "";
const WEB_PUSH_PRIVATE_KEY = process.env.WEB_PUSH_PRIVATE_KEY?.trim() ?? "";
const WEB_PUSH_SUBJECT = process.env.WEB_PUSH_SUBJECT?.trim() ?? "";

const NOTIFICATION_ICON = "/pwa/riwak-192.png?v=2026-04-17-appicon";
const NOTIFICATION_BADGE = "/brand/riwak-icon-only.png?v=2026-04-17-transparent";

let vapidConfigured = false;

type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string | null;
};

type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function getPrismaUniqueErrorCode(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
}

function ensureWebPushConfigured() {
  if (!WEB_PUSH_PUBLIC_KEY || !WEB_PUSH_PRIVATE_KEY || !WEB_PUSH_SUBJECT) {
    return false;
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(
      WEB_PUSH_SUBJECT,
      WEB_PUSH_PUBLIC_KEY,
      WEB_PUSH_PRIVATE_KEY,
    );
    vapidConfigured = true;
  }

  return true;
}

function isExpiredPushSubscriptionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (((error as { statusCode?: number }).statusCode ?? 0) === 404 ||
      ((error as { statusCode?: number }).statusCode ?? 0) === 410)
  );
}

function toPushMessage(payload: PushNotificationPayload) {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_BADGE,
  });
}

function toWebPushSubscription(subscription: PushSubscriptionRecord) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

async function loadSubscriptions(
  where: Prisma.PushSubscriptionWhereInput,
): Promise<PushSubscriptionRecord[]> {
  return prisma.pushSubscription.findMany({
    where,
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });
}

async function createDeliveryLock(input: {
  subscriptionId: string;
  eventKey: string;
  kind: NotificationKind;
}) {
  try {
    return await prisma.notificationDelivery.create({
      data: input,
      select: {
        id: true,
      },
    });
  } catch (error) {
    if (getPrismaUniqueErrorCode(error) === "P2002") {
      return null;
    }

    throw error;
  }
}

async function sendPayloadToSubscriptions(
  subscriptions: PushSubscriptionRecord[],
  payload: PushNotificationPayload,
) {
  if (!subscriptions.length || !ensureWebPushConfigured()) {
    return;
  }

  const message = toPushMessage(payload);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const delivery = await createDeliveryLock({
        subscriptionId: subscription.id,
        eventKey: payload.eventKey,
        kind: payload.kind,
      });

      if (!delivery) {
        return;
      }

      try {
        await webpush.sendNotification(
          toWebPushSubscription(subscription),
          message,
        );
      } catch (error) {
        if (isExpiredPushSubscriptionError(error)) {
          await prisma.pushSubscription.deleteMany({
            where: { id: subscription.id },
          });
          return;
        }

        await prisma.notificationDelivery.deleteMany({
          where: { id: delivery.id },
        });
        console.error("Echec d'envoi de notification push", error);
      }
    }),
  );
}

export function isWebPushConfigured() {
  return Boolean(WEB_PUSH_PUBLIC_KEY && WEB_PUSH_PRIVATE_KEY && WEB_PUSH_SUBJECT);
}

export function getWebPushPublicKey() {
  return WEB_PUSH_PUBLIC_KEY;
}

export async function upsertPushSubscription(
  userId: string,
  subscription: PushSubscriptionInput,
) {
  return prisma.pushSubscription.upsert({
    where: {
      endpoint: subscription.endpoint,
    },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: subscription.userAgent ?? null,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: subscription.userAgent ?? null,
    },
    select: {
      id: true,
    },
  });
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({
    where: {
      userId,
      endpoint,
    },
  });
}

export async function sendStaffNewOrderNotification(input: {
  orderId: string;
  customerName: string;
  itemsSummary: string;
}) {
  const subscriptions = await loadSubscriptions({
    user: {
      role: {
        in: ["STAFF", "ADMIN"],
      },
      staffUser: {
        is: {
          active: true,
        },
      },
    },
  });

  const payload = buildStaffNewOrderNotification(input);
  await sendPayloadToSubscriptions(subscriptions, payload);
}

export async function sendCustomerOrderReadyNotification(input: {
  userId: string;
  orderId: string;
}) {
  const subscriptions = await loadSubscriptions({
    userId: input.userId,
  });

  const payload = buildCustomerOrderReadyNotification({
    orderId: input.orderId,
  });
  await sendPayloadToSubscriptions(subscriptions, payload);
}

export async function sendCustomerRewardEarnedNotification(input: {
  userId: string;
  sourceKey: string;
  rewardsCreated: number;
}) {
  const subscriptions = await loadSubscriptions({
    userId: input.userId,
  });

  const payload = buildCustomerRewardEarnedNotification({
    sourceKey: input.sourceKey,
    rewardsCreated: input.rewardsCreated,
  });
  await sendPayloadToSubscriptions(subscriptions, payload);
}
