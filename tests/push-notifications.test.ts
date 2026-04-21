import { describe, expect, it } from "vitest";

import {
  buildCustomerOrderReadyNotification,
  buildCustomerRewardEarnedNotification,
  buildStaffNewOrderNotification,
  buildStaffStampRequestNotification,
} from "../src/lib/push-notification-payloads";

describe("push notification payloads", () => {
  it("builds the staff new-order notification payload", () => {
    const payload = buildStaffNewOrderNotification({
      orderId: "ord_123",
      customerName: "Ismail",
      itemsSummary: "Express x1",
    });

    expect(payload).toMatchObject({
      kind: "STAFF_NEW_ORDER",
      eventKey: "staff:new-order:ord_123",
      title: "Nouvelle commande",
      body: "Express x1 pour Ismail",
      url: "/staff/orders/ord_123",
      tag: "staff-order-ord_123",
    });
  });

  it("builds the staff stamp-request notification payload", () => {
    const payload = buildStaffStampRequestNotification({
      requestId: "req_123",
      customerId: "cus_456",
      customerName: "Ismail",
      memberId: 7,
    });

    expect(payload).toMatchObject({
      kind: "STAFF_STAMP_REQUEST",
      eventKey: "staff:stamp-request:req_123",
      title: "Demande de tampon",
      body: "Ismail · #0007",
      url: "/staff/customers?stampRequest=req_123",
      tag: "staff-stamp-request-req_123",
      data: {
        stampRequestId: "req_123",
        customerId: "cus_456",
        approvalUrl: "/api/staff/stamp-requests/req_123/approve",
      },
    });

    expect(payload.actions).toEqual([
      {
        action: "approve-stamp-request",
        title: "Approuver",
      },
    ]);
  });

  it("builds the customer order-ready notification payload", () => {
    const payload = buildCustomerOrderReadyNotification({
      orderId: "ord_456",
    });

    expect(payload).toMatchObject({
      kind: "CUSTOMER_ORDER_READY",
      eventKey: "customer:order-ready:ord_456",
      title: "Votre commande est prête",
      body: "Vous pouvez venir récupérer votre boisson.",
      url: "/orders/ord_456",
      tag: "customer-order-ord_456",
    });
  });

  it("builds singular and plural reward-earned notifications", () => {
    const single = buildCustomerRewardEarnedNotification({
      sourceKey: "order:ord_789",
      rewardsCreated: 1,
    });
    const plural = buildCustomerRewardEarnedNotification({
      sourceKey: "manual:reward_a,reward_b",
      rewardsCreated: 2,
    });

    expect(single).toMatchObject({
      kind: "CUSTOMER_REWARD_EARNED",
      title: "Boisson offerte débloquée",
      body: "Vous avez gagné une boisson offerte.",
      url: "/rewards",
    });

    expect(plural).toMatchObject({
      kind: "CUSTOMER_REWARD_EARNED",
      title: "Boissons offertes débloquées",
      body: "Vous avez gagné 2 boissons offertes.",
      eventKey: "customer:reward-earned:manual:reward-a-reward-b",
    });
  });
});
