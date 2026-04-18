export const LOYALTY_STAMP_THRESHOLD = 8;

export const PICKUP_OPTIONS = [0, 10, 15, 20] as const;
export type PickupOptionMinutes = (typeof PICKUP_OPTIONS)[number];

export const SUGAR_OPTIONS = [0, 1, 2, 3] as const;
export type SugarCount = (typeof SUGAR_OPTIONS)[number];

export const MAX_VOICE_NOTE_SECONDS = 15;
export const MAX_VOICE_NOTE_FILE_BYTES = 512_000;
export const MAX_VOICE_NOTE_DATA_URL_LENGTH = 750_000;

export const ORDER_STATUSES = [
  "RECEIVED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "CANCELLED",
  "EXPIRED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const TERMINAL_ORDER_STATUSES = [
  "PICKED_UP",
  "CANCELLED",
  "EXPIRED",
] as const;
export const STAFF_QUEUE_TERMINAL_VISIBILITY_HOURS = 24;
export const TERMINAL_ORDER_RETENTION_DAYS = 30;

export const CUSTOMER_TYPES = [
  "NEW",
  "RETURNING",
  "TRUSTED",
  "LIMITED",
] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const REWARD_STATUSES = ["AVAILABLE", "REDEEMED", "EXPIRED"] as const;
export type RewardStatus = (typeof REWARD_STATUSES)[number];

export const REWARD_TYPES = ["FREE_DRINK"] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

export const LOYALTY_EVENT_TYPES = ["EARNED", "REDEEMED", "ADJUSTED"] as const;
export type LoyaltyEventType = (typeof LOYALTY_EVENT_TYPES)[number];

export const TRUST_EVENT_TYPES = [
  "TRUSTED",
  "LIMITED",
  "UNLIMITED",
  "NOTE",
] as const;

export type TrustEventType = (typeof TRUST_EVENT_TYPES)[number];

export function normalizePhoneNumber(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.startsWith("212")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `+212${digits.slice(1)}`;
  }

  if (digits.length >= 9 && digits.length <= 15) {
    return `+${digits}`;
  }

  return digits;
}

export function slugifyMenuName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isActiveOrderStatus(status: OrderStatus) {
  return ["RECEIVED", "ACCEPTED", "PREPARING", "READY"].includes(status);
}

export function isTerminalOrderStatus(status: OrderStatus) {
  return TERMINAL_ORDER_STATUSES.includes(
    status as (typeof TERMINAL_ORDER_STATUSES)[number],
  );
}

export function terminalOrderVisibilityCutoff(now = new Date()) {
  return new Date(
    now.getTime() - STAFF_QUEUE_TERMINAL_VISIBILITY_HOURS * 60 * 60 * 1000,
  );
}

export function terminalOrderRetentionCutoff(now = new Date()) {
  return new Date(
    now.getTime() - TERMINAL_ORDER_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

export function compareStaffQueueOrders<
  T extends {
    status: OrderStatus;
    placedAt: Date;
    createdAt?: Date | null;
    id?: string | null;
  },
>(left: T, right: T) {
  const leftActive = isActiveOrderStatus(left.status);
  const rightActive = isActiveOrderStatus(right.status);

  if (leftActive !== rightActive) {
    return leftActive ? -1 : 1;
  }

  const placedAtDiff = right.placedAt.getTime() - left.placedAt.getTime();
  if (placedAtDiff !== 0) {
    return placedAtDiff;
  }

  const leftCreatedAt = left.createdAt?.getTime() ?? 0;
  const rightCreatedAt = right.createdAt?.getTime() ?? 0;
  const createdAtDiff = rightCreatedAt - leftCreatedAt;
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  const leftId = left.id ?? "";
  const rightId = right.id ?? "";
  return rightId.localeCompare(leftId);
}

export function computeOrderExpiresAt(
  placedAt: Date,
  unpaidOrderExpiryMinutes: number,
) {
  return new Date(placedAt.getTime() + unpaidOrderExpiryMinutes * 60_000);
}

export function pickupMinutesToLabel(minutes: PickupOptionMinutes) {
  return minutes === 0 ? "Maintenant" : `Dans ${minutes} min`;
}

export function canCreateOrder(params: {
  activeUnpaidOrderCount: number;
  activeOrderLimitPerCustomer: number;
  itemQuantity: number;
  newCustomerMaxItems: number;
  customerType: CustomerType;
}) {
  const {
    activeUnpaidOrderCount,
    activeOrderLimitPerCustomer,
    itemQuantity,
    newCustomerMaxItems,
    customerType,
  } = params;

  if (activeUnpaidOrderCount >= activeOrderLimitPerCustomer) {
    return {
      allowed: false,
      reason: "Vous avez déjà une commande en attente.",
    } as const;
  }

  if ((customerType === "NEW" || customerType === "LIMITED") && itemQuantity > newCustomerMaxItems) {
    return {
      allowed: false,
      reason: "Le compte est limité à une petite commande pour le moment.",
    } as const;
  }

  return { allowed: true as const };
}

export function isValidSugarCount(value: number): value is SugarCount {
  return SUGAR_OPTIONS.includes(value as SugarCount);
}

export function normalizeVoiceNoteInput(input: {
  dataUrl?: string | null;
  mimeType?: string | null;
  durationSec?: number | null;
}) {
  const dataUrl = input.dataUrl?.trim() ?? "";
  const mimeType = input.mimeType?.trim() ?? "";
  const durationSec =
    typeof input.durationSec === "number" && Number.isFinite(input.durationSec)
      ? Math.trunc(input.durationSec)
      : null;

  if (!dataUrl && !mimeType && !durationSec) {
    return {
      ok: true as const,
      value: null,
    };
  }

  if (!dataUrl || !mimeType || !durationSec) {
    return {
      ok: false as const,
      reason: "incomplete",
    };
  }

  if (!mimeType.startsWith("audio/")) {
    return {
      ok: false as const,
      reason: "mime",
    };
  }

  if (durationSec < 1 || durationSec > MAX_VOICE_NOTE_SECONDS) {
    return {
      ok: false as const,
      reason: "duration",
    };
  }

  if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
    return {
      ok: false as const,
      reason: "payload",
    };
  }

  if (dataUrl.length > MAX_VOICE_NOTE_DATA_URL_LENGTH) {
    return {
      ok: false as const,
      reason: "size",
    };
  }

  return {
    ok: true as const,
    value: {
      dataUrl,
      mimeType,
      durationSec,
    },
  };
}

export function applyLoyaltyPurchase(params: {
  currentStampCount: number;
  lifetimeStampCount: number;
  availableFreeDrinks: number;
  stampsEarned?: number;
  threshold?: number;
}) {
  const threshold = params.threshold ?? LOYALTY_STAMP_THRESHOLD;
  const stampsEarned = params.stampsEarned ?? 1;
  let currentStampCount = params.currentStampCount + stampsEarned;
  let availableFreeDrinks = params.availableFreeDrinks;
  let rewardsCreated = 0;

  while (currentStampCount >= threshold) {
    currentStampCount -= threshold;
    availableFreeDrinks += 1;
    rewardsCreated += 1;
  }

  return {
    currentStampCount,
    lifetimeStampCount: params.lifetimeStampCount + stampsEarned,
    availableFreeDrinks,
    rewardsCreated,
  };
}

export function redeemRewardState(params: {
  currentStampCount: number;
  lifetimeStampCount: number;
  availableFreeDrinks: number;
}) {
  if (params.availableFreeDrinks <= 0) {
    return null;
  }

  return {
    currentStampCount: params.currentStampCount,
    lifetimeStampCount: params.lifetimeStampCount,
    availableFreeDrinks: params.availableFreeDrinks - 1,
  };
}

export function displayCustomerType(params: {
  customerType: CustomerType;
  limitedUntil?: Date | null;
  trustedUntil?: Date | null;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  if (params.limitedUntil && params.limitedUntil.getTime() > now.getTime()) {
    return "LIMITED" as const;
  }

  if (params.trustedUntil && params.trustedUntil.getTime() > now.getTime()) {
    return "TRUSTED" as const;
  }

  return params.customerType;
}

export function orderStatusProgress(status: OrderStatus) {
  const index = ORDER_STATUSES.indexOf(status);
  return index < 0 ? 0 : index + 1;
}
