import type { NotificationKind } from "@prisma/client";

import { formatMemberId } from "./format";

type PushNotificationAction = {
  action: string;
  title: string;
};

type PushNotificationPayload = {
  kind: NotificationKind;
  eventKey: string;
  title: string;
  body: string;
  url: string;
  tag: string;
  actions?: PushNotificationAction[];
  data?: Record<string, string>;
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

export function buildStaffStampRequestNotification(input: {
  requestId: string;
  customerId: string;
  customerName: string;
  memberId: number;
}): PushNotificationPayload {
  const url = `/staff/customers?stampRequest=${input.requestId}`;

  return {
    kind: "STAFF_STAMP_REQUEST",
    eventKey: `staff:stamp-request:${input.requestId}`,
    title: "Demande de tampon",
    body: trimNotificationBody(
      `${input.customerName} · ${formatMemberId(input.memberId)}`,
    ),
    url,
    tag: `staff-stamp-request-${input.requestId}`,
    actions: [
      {
        action: "approve-stamp-request",
        title: "Approuver",
      },
    ],
    data: {
      stampRequestId: input.requestId,
      customerId: input.customerId,
      approvalUrl: `/api/staff/stamp-requests/${input.requestId}/approve`,
    },
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
