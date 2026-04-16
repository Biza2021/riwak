import { describe, expect, it } from "vitest";

import {
  applyLoyaltyPurchase,
  canCreateOrder,
  computeOrderExpiresAt,
  displayCustomerType,
  redeemRewardState,
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
});

describe("loyalty rules", () => {
  it("increments stamps and unlocks a reward at 5", () => {
    const result = applyLoyaltyPurchase({
      currentStampCount: 4,
      lifetimeStampCount: 9,
      availableFreeDrinks: 0,
      stampsEarned: 1,
    });

    expect(result.currentStampCount).toBe(0);
    expect(result.lifetimeStampCount).toBe(10);
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
