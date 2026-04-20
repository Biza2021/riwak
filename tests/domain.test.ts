import { describe, expect, it } from "vitest";

import {
  applyLoyaltyPurchase,
  canCreateOrder,
  compareStaffQueueOrders,
  computeOrderExpiresAt,
  displayCustomerType,
  isTerminalOrderStatus,
  isValidSugarCount,
  normalizeVoiceNoteInput,
  redeemRewardState,
  terminalOrderRetentionCutoff,
  terminalOrderVisibilityCutoff,
} from "../src/lib/domain";

describe("order rules", () => {
  it("calculates the expiry time for unpaid orders", () => {
    const placedAt = new Date("2026-04-16T10:00:00Z");
    const expiresAt = computeOrderExpiresAt(placedAt, 30);

    expect(expiresAt.toISOString()).toBe("2026-04-16T10:30:00.000Z");
  });

  it("blocks a second active unpaid order", () => {
    const result = canCreateOrder({
      activeUnpaidOrderCount: 1,
      activeOrderLimitPerCustomer: 1,
      itemQuantity: 1,
      newCustomerMaxItems: 2,
      customerType: "RETURNING",
    });

    expect(result.allowed).toBe(false);
  });

  it("allows a single unpaid order for a regular customer", () => {
    const result = canCreateOrder({
      activeUnpaidOrderCount: 0,
      activeOrderLimitPerCustomer: 1,
      itemQuantity: 1,
      newCustomerMaxItems: 2,
      customerType: "RETURNING",
    });

    expect(result.allowed).toBe(true);
  });

  it("keeps active orders ahead of terminal orders in the staff queue", () => {
    const orders = [
      {
        id: "cancelled",
        status: "CANCELLED" as const,
        placedAt: new Date("2026-04-16T10:10:00Z"),
        createdAt: new Date("2026-04-16T10:10:00Z"),
      },
      {
        id: "received",
        status: "RECEIVED" as const,
        placedAt: new Date("2026-04-16T10:00:00Z"),
        createdAt: new Date("2026-04-16T10:00:00Z"),
      },
    ].sort(compareStaffQueueOrders);

    expect(orders.map((order) => order.id)).toEqual(["received", "cancelled"]);
  });

  it("keeps the newest active order first within the staff queue", () => {
    const orders = [
      {
        id: "older",
        status: "RECEIVED" as const,
        placedAt: new Date("2026-04-16T10:00:00Z"),
        createdAt: new Date("2026-04-16T10:00:00Z"),
      },
      {
        id: "newer",
        status: "RECEIVED" as const,
        placedAt: new Date("2026-04-16T10:05:00Z"),
        createdAt: new Date("2026-04-16T10:05:00Z"),
      },
    ].sort(compareStaffQueueOrders);

    expect(orders.map((order) => order.id)).toEqual(["newer", "older"]);
  });

  it("recognizes terminal order statuses", () => {
    expect(isTerminalOrderStatus("PICKED_UP")).toBe(true);
    expect(isTerminalOrderStatus("CANCELLED")).toBe(true);
    expect(isTerminalOrderStatus("EXPIRED")).toBe(true);
    expect(isTerminalOrderStatus("READY")).toBe(false);
  });

  it("builds the correct terminal order visibility and retention windows", () => {
    const now = new Date("2026-04-18T12:00:00Z");

    expect(terminalOrderVisibilityCutoff(now).toISOString()).toBe(
      "2026-04-17T12:00:00.000Z",
    );
    expect(terminalOrderRetentionCutoff(now).toISOString()).toBe(
      "2026-03-19T12:00:00.000Z",
    );
  });

  it("accepts only the configured sugar options", () => {
    expect(isValidSugarCount(2)).toBe(true);
    expect(isValidSugarCount(4)).toBe(false);
  });

  it("accepts a valid short voice note payload", () => {
    const result = normalizeVoiceNoteInput({
      dataUrl: "data:audio/webm;base64,ZmFrZQ==",
      mimeType: "audio/webm",
      durationSec: 12,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        dataUrl: "data:audio/webm;base64,ZmFrZQ==",
        mimeType: "audio/webm",
        durationSec: 12,
      },
    });
  });

  it("rejects an oversized or invalid voice note payload", () => {
    const result = normalizeVoiceNoteInput({
      dataUrl: "data:text/plain;base64,ZmFrZQ==",
      mimeType: "text/plain",
      durationSec: 3,
    });

    expect(result.ok).toBe(false);
  });
});

describe("loyalty rules", () => {
  it("increments stamps and unlocks a reward at 5", () => {
    const result = applyLoyaltyPurchase({
      currentStampCount: 4,
      lifetimeStampCount: 15,
      availableFreeDrinks: 0,
      stampsEarned: 1,
    });

    expect(result.currentStampCount).toBe(0);
    expect(result.lifetimeStampCount).toBe(16);
    expect(result.availableFreeDrinks).toBe(1);
    expect(result.rewardsCreated).toBe(1);
  });

  it("decrements available free drinks when redeeming", () => {
    const result = redeemRewardState({
      currentStampCount: 2,
      lifetimeStampCount: 12,
      availableFreeDrinks: 2,
    });

    expect(result?.availableFreeDrinks).toBe(1);
  });
});

describe("trust flags", () => {
  it("shows trusted customers when trust is active", () => {
    const result = displayCustomerType({
      customerType: "RETURNING",
      trustedUntil: new Date("2026-04-18T00:00:00Z"),
      now: new Date("2026-04-16T00:00:00Z"),
    });

    expect(result).toBe("TRUSTED");
  });

  it("shows limited customers when limitation is active", () => {
    const result = displayCustomerType({
      customerType: "RETURNING",
      limitedUntil: new Date("2026-04-18T00:00:00Z"),
      now: new Date("2026-04-16T00:00:00Z"),
    });

    expect(result).toBe("LIMITED");
  });
});
