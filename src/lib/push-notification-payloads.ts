import type { NotificationKind } from "@prisma/client";

type PushNotificationPayload = {
  kind: NotificationKind;
  eventKey: string;
  title: string;
  body: string;
  url: string;
  tag: string;
};

function trimNotificationBody(value: string, maxLength = 120) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildStaffNewOrderNotification(input: {
  orderId: string;
  customerName: string;
  itemsSummary: string;
}): PushNotificationPayload {
  return {
    kind: "STAFF_NEW_ORDER",
    eventKey: `staff:new-order:${input.orderId}`,
    title: "Nouvelle commande",
    body: trimNotificationBody(`${input.itemsSummary} pour ${input.customerName}`),
    url: `/staff/orders/${input.orderId}`,
    tag: `staff-order-${input.orderId}`,
  };
}

export function buildCustomerOrderReadyNotification(input: {
  orderId: string;
}): PushNotificationPayload {
  return {
    kind: "CUSTOMER_ORDER_READY",
    eventKey: `customer:order-ready:${input.orderId}`,
    title: "Votre commande est prête",
    body: "Vous pouvez venir récupérer votre boisson.",
    url: `/orders/${input.orderId}`,
    tag: `customer-order-${input.orderId}`,
  };
}

export function buildCustomerRewardEarnedNotification(input: {
  sourceKey: string;
  rewardsCreated: number;
}): PushNotificationPayload {
  const rewardCount = Math.max(1, input.rewardsCreated);
  const normalizedSourceKey = input.sourceKey.replace(/[^a-z0-9-:]/gi, "-");

  return {
    kind: "CUSTOMER_REWARD_EARNED",
    eventKey: `customer:reward-earned:${normalizedSourceKey}`,
    title:
      rewardCount > 1
        ? "Boissons offertes débloquées"
        : "Boisson offerte débloquée",
    body:
      rewardCount > 1
        ? `Vous avez gagné ${rewardCount} boissons offertes.`
        : "Vous avez gagné une boisson offerte.",
    url: "/rewards",
    tag: `reward-earned-${normalizedSourceKey.replace(/[:]/g, "-")}`,
  };
}

export type { PushNotificationPayload };
