"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { generateLoyaltyPin, normalizeCustomerPhone, normalizeStaffEmail, verifySecret } from "./auth";
import { prisma } from "./db";
import {
  applyLoyaltyPurchase,
  canCreateOrder,
  computeOrderExpiresAt,
  displayCustomerType,
  isValidSugarCount,
  MAX_VOICE_NOTE_DATA_URL_LENGTH,
  MAX_VOICE_NOTE_SECONDS,
  normalizeVoiceNoteInput,
  redeemRewardState,
  slugifyMenuName,
} from "./domain";
import { createSession, clearSession, requireCustomerSession, requireStaffSession } from "./session";
import { ensureStoreSettings, expireOverdueOrders } from "./queries";
import {
  sendCustomerOrderReadyNotification,
  sendCustomerRewardEarnedNotification,
  sendStaffNewOrderNotification,
} from "./push-notifications";
import type { StaffCustomerCardSnapshot } from "./staff-customers";
import {
  deleteVoiceNote,
  isVoiceNoteStorageError,
  isVoiceNoteStorageConfigured,
  uploadVoiceNote,
} from "./voice-note-storage";

const customerRegisterSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phoneNumber: z.string().trim().min(6).max(24),
  redirectTo: z.string().optional(),
});

const customerLoginSchema = z.object({
  phoneNumber: z.string().trim().min(6).max(24),
  loyaltyPin: z.string().trim().length(6),
  redirectTo: z.string().optional(),
});

const staffCreateCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phoneNumber: z.string().trim().min(6).max(24),
});

const staffLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(4),
  redirectTo: z.string().optional(),
});

const createOrderSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
  pickupMinutes: z.coerce.number().int().refine((value) => [0, 10, 15, 20].includes(value)),
  sugarCount: z.coerce.number().int().refine(isValidSugarCount),
  notes: z.string().trim().max(200).optional().default(""),
  voiceNoteDataUrl: z
    .string()
    .trim()
    .max(MAX_VOICE_NOTE_DATA_URL_LENGTH)
    .optional()
    .default(""),
  voiceNoteMimeType: z.string().trim().max(120).optional().default(""),
  voiceNoteDurationSec: z.coerce.number().int().min(1).max(MAX_VOICE_NOTE_SECONDS).optional(),
  returnTo: z.string().optional(),
});

const statusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "RECEIVED",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "PICKED_UP",
    "CANCELLED",
    "EXPIRED",
  ]),
  returnTo: z.string().optional(),
});

const trustSchema = z.object({
  customerId: z.string().min(1),
  action: z.enum(["TRUST", "LIMIT", "CLEAR", "NOTE"]),
  reason: z.string().trim().max(200).optional().default(""),
  limitHours: z.coerce.number().int().min(1).max(720).optional(),
  returnTo: z.string().optional(),
});

const loyaltyAdjustSchema = z.object({
  customerId: z.string().min(1),
  delta: z.coerce.number().int().min(-10).max(10),
  reason: z.string().trim().max(200).optional().default(""),
  returnTo: z.string().optional(),
});

const quickStampSchema = z.object({
  customerId: z.string().min(1),
  delta: z.union([z.literal(1), z.literal(2)]),
});

const quickRewardSchema = z.object({
  customerId: z.string().min(1),
});

const rewardRedeemSchema = z.object({
  rewardId: z.string().min(1).optional(),
  returnTo: z.string().optional(),
});

const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  pickupAddress: z.string().trim().min(2).max(180),
  activeOrderLimitPerCustomer: z.coerce.number().int().min(1).max(5),
  unpaidOrderExpiryMinutes: z.coerce.number().int().min(5).max(240),
  newCustomerMaxItems: z.coerce.number().int().min(1).max(10),
  enableTrustedRegularFlag: z.boolean(),
});

const menuItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(220).optional().default(""),
  price: z.coerce.number().positive().max(999),
  displayOrder: z.coerce.number().int().min(0).max(99),
  isActive: z.boolean(),
  isQualifying: z.boolean(),
  notesRequired: z.boolean(),
});

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formBool(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true";
}

function redirectWithError(path: string, errorCode: string): never {
  const url = new URL(path, "http://riwak.local");
  url.searchParams.set("error", errorCode);
  redirect(`${url.pathname}${url.search}`);
}

function safePath(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return value.startsWith("/") ? value : fallback;
}

function isUniqueConstraintError(error: unknown, field?: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  if (!field) {
    return true;
  }

  const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
  return targets.includes(field);
}

function isSerializableTransactionConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

class ActionConflictError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ActionConflictError";
  }
}

type StaffCustomerLoyaltyActionResult =
  | {
      ok: true;
      customerId: string;
      currentStampCount: number;
      lifetimeStampCount: number;
      availableFreeDrinks: number;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

type StaffCreateCustomerActionResult =
  | {
      ok: true;
      customer: StaffCustomerCardSnapshot;
      recoveryCode: string;
    }
  | {
      ok: false;
      error: string;
    };

type CreatedCustomerAccount = {
  userId: string;
  customer: {
    id: string;
    memberId: number;
    fullName: string;
    phoneNumber: string;
    loyaltyPin: string;
    customerType: StaffCustomerCardSnapshot["customerType"];
  };
};

async function createCustomerAccount(params: {
  fullName: string;
  phoneNumber: string;
}): Promise<CreatedCustomerAccount> {
  const phoneNumber = normalizeCustomerPhone(params.phoneNumber);

  if (!phoneNumber) {
    throw new ActionConflictError("BAD_PHONE");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const user = await prisma.user.create({
        data: {
          role: "CUSTOMER",
          customerProfile: {
            create: {
              fullName: params.fullName,
              phoneNumber,
              loyaltyPin: generateLoyaltyPin(),
              customerType: "NEW",
              loyaltyAccount: {
                create: {
                  currentStampCount: 0,
                  lifetimeStampCount: 0,
                  availableFreeDrinks: 0,
                },
              },
            },
          },
        },
        select: {
          id: true,
          customerProfile: {
            select: {
              id: true,
              memberId: true,
              fullName: true,
              phoneNumber: true,
              loyaltyPin: true,
              customerType: true,
            },
          },
        },
      });

      if (!user.customerProfile) {
        throw new Error("CUSTOMER_PROFILE_MISSING");
      }

      return {
        userId: user.id,
        customer: user.customerProfile,
      };
    } catch (error) {
      if (isUniqueConstraintError(error, "phoneNumber")) {
        throw new ActionConflictError("PHONE_EXISTS");
      }

      if (isUniqueConstraintError(error, "loyaltyPin")) {
        continue;
      }

      throw error;
    }
  }

  throw new ActionConflictError("UNKNOWN");
}

export async function registerCustomerAction(formData: FormData) {
  const payload = customerRegisterSchema.safeParse({
    fullName: formText(formData, "fullName"),
    phoneNumber: formText(formData, "phoneNumber"),
    redirectTo: formText(formData, "redirectTo") || undefined,
  });

  if (!payload.success) {
    redirectWithError("/login", "BAD_FORM");
  }

  let created: CreatedCustomerAccount;

  try {
    created = await createCustomerAccount({
      fullName: payload.data.fullName,
      phoneNumber: payload.data.phoneNumber,
    });
  } catch (error) {
    if (error instanceof ActionConflictError) {
      redirectWithError("/register", error.code);
    }

    throw error;
  }

  await createSession(created.userId);
  revalidatePath("/");
  revalidatePath("/app");
  redirect(safePath(payload.data.redirectTo, "/app?setup=1"));
}

export async function createStaffCustomerAction(input: {
  fullName: string;
  phoneNumber: string;
}): Promise<StaffCreateCustomerActionResult> {
  await requireStaffSession();
  const payload = staffCreateCustomerSchema.safeParse(input);

  if (!payload.success) {
    return { ok: false, error: "BAD_FORM" };
  }

  try {
    const created = await createCustomerAccount(payload.data);

    revalidatePath("/staff/customers");
    revalidatePath(`/staff/customers/${created.customer.id}`);
    revalidatePath("/login");

    return {
      ok: true,
      customer: {
        id: created.customer.id,
        memberId: created.customer.memberId,
        fullName: created.customer.fullName,
        phoneNumber: created.customer.phoneNumber,
        customerType: created.customer.customerType,
        currentStampCount: 0,
        lifetimeStampCount: 0,
        availableFreeDrinks: 0,
        lastOrderAt: null,
      },
      recoveryCode: created.customer.loyaltyPin,
    };
  } catch (error) {
    if (error instanceof ActionConflictError) {
      return { ok: false, error: error.code };
    }

    throw error;
  }
}

export async function customerLoginAction(formData: FormData) {
  const payload = customerLoginSchema.safeParse({
    phoneNumber: formText(formData, "phoneNumber"),
    loyaltyPin: formText(formData, "loyaltyPin"),
    redirectTo: formText(formData, "redirectTo") || undefined,
  });

  if (!payload.success) {
    redirectWithError("/login", "BAD_FORM");
  }

  const phoneNumber = normalizeCustomerPhone(payload.data.phoneNumber);
  const customer = await prisma.customerProfile.findFirst({
    where: {
      phoneNumber,
      loyaltyPin: payload.data.loyaltyPin,
    },
    include: {
      user: true,
    },
  });

  if (!customer) {
    redirectWithError("/login", "INVALID_PIN");
  }

  await createSession(customer.userId);
  revalidatePath("/app");
  redirect(safePath(payload.data.redirectTo, "/app"));
}

export async function staffLoginAction(formData: FormData) {
  const payload = staffLoginSchema.safeParse({
    email: formText(formData, "email"),
    password: formText(formData, "password"),
    redirectTo: formText(formData, "redirectTo") || undefined,
  });

  if (!payload.success) {
    redirectWithError("/staff/login", "BAD_FORM");
  }

  const email = normalizeStaffEmail(payload.data.email);
  const staff = await prisma.staffUser.findUnique({
    where: { email },
    include: { user: true },
  });

  if (!staff || !staff.active) {
    redirectWithError("/staff/login", "INVALID_CREDENTIALS");
  }

  const passwordValid = await verifySecret(payload.data.password, staff.passwordHash);
  if (!passwordValid) {
    redirectWithError("/staff/login", "INVALID_CREDENTIALS");
  }

  await createSession(staff.userId);
  revalidatePath("/staff/orders");
  redirect(safePath(payload.data.redirectTo, "/staff/orders"));
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function staffLogoutAction() {
  await clearSession();
  redirect("/staff/login");
}

export async function createOrderAction(formData: FormData) {
  const session = await requireCustomerSession();
  const customer = session.user.customerProfile;
  if (!customer) {
    redirectWithError("/register", "NOT_AUTHENTICATED");
  }

  const returnTo = formText(formData, "returnTo") || "/menu";

  const payload = createOrderSchema.safeParse({
    menuItemId: formText(formData, "menuItemId"),
    quantity: formText(formData, "quantity"),
    pickupMinutes: formText(formData, "pickupMinutes"),
    sugarCount: formText(formData, "sugarCount"),
    notes: formText(formData, "notes"),
    voiceNoteDataUrl: formText(formData, "voiceNoteDataUrl"),
    voiceNoteMimeType: formText(formData, "voiceNoteMimeType"),
    voiceNoteDurationSec: formText(formData, "voiceNoteDurationSec") || undefined,
    returnTo: returnTo || undefined,
  });

  if (!payload.success) {
    redirectWithError(returnTo, "BAD_FORM");
  }

  const voiceNote = normalizeVoiceNoteInput({
    dataUrl: payload.data.voiceNoteDataUrl,
    mimeType: payload.data.voiceNoteMimeType,
    durationSec: payload.data.voiceNoteDurationSec ?? null,
  });

  if (!voiceNote.ok) {
    redirectWithError(returnTo, "BAD_FORM");
  }

  if (voiceNote.value && !isVoiceNoteStorageConfigured()) {
    redirectWithError(returnTo, "VOICE_NOTE_UNAVAILABLE");
  }

  const settings = await ensureStoreSettings();
  const now = new Date();
  const customerSnapshot = displayCustomerType({
    customerType: customer.customerType,
    limitedUntil: customer.limitedUntil,
    trustedUntil: customer.trustedUntil,
    now,
  });

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: payload.data.menuItemId },
  });

  if (!menuItem || !menuItem.isActive) {
    redirectWithError(returnTo, "MENU_INACTIVE");
  }

  await expireOverdueOrders({ force: true });

  const pickupTime = new Date(now.getTime() + payload.data.pickupMinutes * 60_000);
  const expiresAt = computeOrderExpiresAt(now, settings.unpaidOrderExpiryMinutes);
  const quantity = payload.data.quantity;
  const totalAmount = new Prisma.Decimal(Number(menuItem.price) * quantity);

  let storedVoiceNote:
    | {
        storageKey: string;
        mimeType: string;
        durationSec: number;
        fileSizeBytes: number;
      }
    | null = null;

  if (voiceNote.value) {
    try {
      storedVoiceNote = await uploadVoiceNote({
        customerId: customer.id,
        dataUrl: voiceNote.value.dataUrl,
        mimeType: voiceNote.value.mimeType,
        durationSec: voiceNote.value.durationSec,
      });
    } catch (error) {
      if (isVoiceNoteStorageError(error) && error.code === "TOO_LARGE") {
        redirectWithError(returnTo, "VOICE_NOTE_TOO_LARGE");
      }

      redirectWithError(returnTo, "VOICE_NOTE_UNAVAILABLE");
    }
  }

  let orderId: string;

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        const activeCount = await tx.order.count({
          where: {
            customerId: customer.id,
            status: {
              in: ["RECEIVED", "ACCEPTED", "PREPARING", "READY"],
            },
            expiresAt: {
              gt: now,
            },
          },
        });

        const eligibility = canCreateOrder({
          activeUnpaidOrderCount: activeCount,
          activeOrderLimitPerCustomer: settings.activeOrderLimitPerCustomer,
          itemQuantity: payload.data.quantity,
          newCustomerMaxItems: settings.newCustomerMaxItems,
          customerType: customerSnapshot,
        });

        if (!eligibility.allowed) {
          throw new ActionConflictError("ACTIVE_ORDER_LIMIT");
        }

        const created = await tx.order.create({
          data: {
            customerId: customer.id,
            status: "RECEIVED",
            pickupTime,
            placedAt: now,
            expiresAt,
            totalAmount,
            isPaidAtShop: true,
            riskState: customerSnapshot,
            itemCount: quantity,
            customerNameSnapshot: customer.fullName,
            customerPhoneSnapshot: customer.phoneNumber,
            customerTypeSnapshot: customerSnapshot,
            sugarCount: payload.data.sugarCount,
            notes: payload.data.notes || null,
            voiceNoteStorageKey: storedVoiceNote?.storageKey ?? null,
            voiceNoteMimeType: storedVoiceNote?.mimeType ?? null,
            voiceNoteDurationSec: storedVoiceNote?.durationSec ?? null,
            voiceNoteFileSizeBytes: storedVoiceNote?.fileSizeBytes ?? null,
            orderItems: {
              create: {
                menuItemId: menuItem.id,
                quantity,
                notes: payload.data.notes || null,
                unitPrice: menuItem.price,
              },
            },
          },
          select: {
            id: true,
          },
        });

        await tx.customerProfile.update({
          where: { id: customer.id },
          data: {
            customerType: customer.customerType === "NEW" ? "RETURNING" : undefined,
            lastOrderAt: now,
          },
        });

        return created;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    orderId = order.id;
  } catch (error) {
    if (
      error instanceof ActionConflictError ||
      isSerializableTransactionConflict(error)
    ) {
      if (storedVoiceNote?.storageKey) {
        await deleteVoiceNote(storedVoiceNote.storageKey).catch(() => undefined);
      }
      redirectWithError(returnTo, "ACTIVE_ORDER_LIMIT");
    }

    if (storedVoiceNote?.storageKey) {
      await deleteVoiceNote(storedVoiceNote.storageKey).catch(() => undefined);
    }

    throw error;
  }

  await sendStaffNewOrderNotification({
    orderId,
    customerName: customer.fullName,
    itemsSummary: `${menuItem.name} x${quantity}`,
  }).catch(() => undefined);

  revalidatePath("/app");
  revalidatePath("/menu");
  revalidatePath("/orders");
  revalidatePath("/staff/orders");
  revalidatePath("/staff/customers");

  redirect(`/order/success/${orderId}`);
}

export async function updateOrderStatusAction(formData: FormData) {
  await requireStaffSession();
  const payload = statusSchema.safeParse({
    orderId: formText(formData, "orderId"),
    status: formText(formData, "status"),
    returnTo: formText(formData, "returnTo") || undefined,
  });

  if (!payload.success) {
    redirectWithError("/staff/orders", "BAD_FORM");
  }

  const order = await prisma.order.findUnique({
    where: { id: payload.data.orderId },
    select: {
      id: true,
      customerId: true,
      status: true,
      loyaltyGrantedAt: true,
      customer: {
        select: {
          userId: true,
          loyaltyAccount: true,
        },
      },
      orderItems: {
        select: {
          quantity: true,
          menuItem: true,
        },
      },
    },
  });

  if (!order) {
    redirectWithError(safePath(payload.data.returnTo, "/staff/orders"), "NOT_FOUND");
  }

  const wasPickedUp = order.status === "PICKED_UP";
  const nextStatus = payload.data.status;
  const shouldGrantLoyalty =
    nextStatus === "PICKED_UP" && !wasPickedUp && !order.loyaltyGrantedAt;
  const qualifyingUnits = shouldGrantLoyalty
    ? order.orderItems.reduce((sum, orderItem) => {
        return sum + (orderItem.menuItem.isQualifying ? orderItem.quantity : 0);
      }, 0)
    : 0;
  const projectedLoyaltyResult =
    shouldGrantLoyalty && qualifyingUnits > 0
      ? applyLoyaltyPurchase({
          currentStampCount: order.customer.loyaltyAccount?.currentStampCount ?? 0,
          lifetimeStampCount: order.customer.loyaltyAccount?.lifetimeStampCount ?? 0,
          availableFreeDrinks: order.customer.loyaltyAccount?.availableFreeDrinks ?? 0,
          stampsEarned: qualifyingUnits,
        })
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
      },
    });

    if (!shouldGrantLoyalty) {
      return;
    }

    if (qualifyingUnits <= 0) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          loyaltyGrantedAt: new Date(),
        },
      });
      return;
    }

    const account = order.customer.loyaltyAccount;
    const loyaltyResult = projectedLoyaltyResult ?? applyLoyaltyPurchase({
      currentStampCount: account?.currentStampCount ?? 0,
      lifetimeStampCount: account?.lifetimeStampCount ?? 0,
      availableFreeDrinks: account?.availableFreeDrinks ?? 0,
      stampsEarned: qualifyingUnits,
    });

    if (account) {
      await tx.loyaltyAccount.update({
        where: { customerId: order.customerId },
        data: {
          currentStampCount: loyaltyResult.currentStampCount,
          lifetimeStampCount: loyaltyResult.lifetimeStampCount,
          availableFreeDrinks: loyaltyResult.availableFreeDrinks,
        },
      });
    } else {
      await tx.loyaltyAccount.create({
        data: {
          customerId: order.customerId,
          currentStampCount: loyaltyResult.currentStampCount,
          lifetimeStampCount: loyaltyResult.lifetimeStampCount,
          availableFreeDrinks: loyaltyResult.availableFreeDrinks,
        },
      });
    }

    await tx.loyaltyStampEvent.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        type: "EARNED",
        stampDelta: qualifyingUnits,
        notes: "Commande récupérée",
      },
    });

    if (loyaltyResult.rewardsCreated > 0) {
      for (let index = 0; index < loyaltyResult.rewardsCreated; index += 1) {
        await tx.reward.create({
          data: {
            customerId: order.customerId,
            type: "FREE_DRINK",
            status: "AVAILABLE",
            sourceOrderId: order.id,
          },
        });
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        loyaltyGrantedAt: new Date(),
      },
    });
  });

  if (nextStatus === "READY" && order.status !== "READY") {
    await sendCustomerOrderReadyNotification({
      userId: order.customer.userId,
      orderId: order.id,
    }).catch(() => undefined);
  }

  if ((projectedLoyaltyResult?.rewardsCreated ?? 0) > 0) {
    await sendCustomerRewardEarnedNotification({
      userId: order.customer.userId,
      sourceKey: `order:${order.id}`,
      rewardsCreated: projectedLoyaltyResult?.rewardsCreated ?? 0,
    }).catch(() => undefined);
  }

  revalidatePath("/staff/orders");
  revalidatePath(`/staff/orders/${order.id}`);
  revalidatePath("/staff/customers");
  revalidatePath(`/staff/customers/${order.customerId}`);
  revalidatePath("/app");
  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
  revalidatePath("/rewards");

  redirect(safePath(payload.data.returnTo, `/staff/orders/${order.id}`));
}

export async function updateTrustAction(formData: FormData) {
  const session = await requireStaffSession();
  const payload = trustSchema.safeParse({
    customerId: formText(formData, "customerId"),
    action: formText(formData, "action"),
    reason: formText(formData, "reason"),
    limitHours: formText(formData, "limitHours") || undefined,
    returnTo: formText(formData, "returnTo") || undefined,
  });

  if (!payload.success) {
    redirectWithError("/staff/customers", "BAD_FORM");
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { id: payload.data.customerId },
    select: {
      id: true,
      userId: true,
      loyaltyAccount: true,
    },
  });

  if (!customer) {
    redirectWithError(safePath(payload.data.returnTo, "/staff/customers"), "NOT_FOUND");
  }

  const now = new Date();
  const hasPastOrders = await prisma.order.count({
    where: {
      customerId: customer.id,
      status: "PICKED_UP",
    },
  });

  await prisma.$transaction(async (tx) => {
    if (payload.data.action === "TRUST") {
      await tx.customerProfile.update({
        where: { id: customer.id },
        data: {
          customerType: "TRUSTED",
          limitedUntil: null,
          trustedUntil: null,
          trustReason: payload.data.reason || "Client régulier",
        },
      });

      await tx.customerTrustEvent.create({
        data: {
          customerId: customer.id,
          staffUserId: session.user.staffUser?.id ?? null,
          type: "TRUSTED",
          reason: payload.data.reason || "Client régulier",
        },
      });
      return;
    }

    if (payload.data.action === "LIMIT") {
      const hours = payload.data.limitHours ?? 72;
      const limitedUntil = new Date(now.getTime() + hours * 60 * 60 * 1000);

      await tx.customerProfile.update({
        where: { id: customer.id },
        data: {
          customerType: "LIMITED",
          limitedUntil,
          trustedUntil: null,
          trustReason: payload.data.reason || "Limitation temporaire",
        },
      });

      await tx.customerTrustEvent.create({
        data: {
          customerId: customer.id,
          staffUserId: session.user.staffUser?.id ?? null,
          type: "LIMITED",
          reason: payload.data.reason || "Limitation temporaire",
          resolvedAt: limitedUntil,
        },
      });
      return;
    }

    if (payload.data.action === "CLEAR") {
      await tx.customerProfile.update({
        where: { id: customer.id },
        data: {
          customerType: hasPastOrders > 0 ? "RETURNING" : "NEW",
          limitedUntil: null,
          trustedUntil: null,
          trustReason: payload.data.reason || "Limitation levée",
        },
      });

      await tx.customerTrustEvent.create({
        data: {
          customerId: customer.id,
          staffUserId: session.user.staffUser?.id ?? null,
          type: "UNLIMITED",
          reason: payload.data.reason || "Limitation levée",
        },
      });
      return;
    }

    await tx.customerTrustEvent.create({
      data: {
        customerId: customer.id,
        staffUserId: session.user.staffUser?.id ?? null,
        type: "NOTE",
        reason: payload.data.reason || "Note staff",
      },
    });
  });

  revalidatePath("/staff/customers");
  revalidatePath(`/staff/customers/${customer.id}`);
  revalidatePath("/staff/orders");
  revalidatePath("/app");
  revalidatePath("/account");
  redirect(safePath(payload.data.returnTo, `/staff/customers/${customer.id}`));
}

export async function adjustLoyaltyAction(formData: FormData) {
  await requireStaffSession();
  const payload = loyaltyAdjustSchema.safeParse({
    customerId: formText(formData, "customerId"),
    delta: formText(formData, "delta"),
    reason: formText(formData, "reason"),
    returnTo: formText(formData, "returnTo") || undefined,
  });

  if (!payload.success) {
    redirectWithError("/staff/customers", "BAD_FORM");
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { id: payload.data.customerId },
    select: {
      id: true,
      userId: true,
      loyaltyAccount: true,
    },
  });

  if (!customer) {
    redirectWithError(safePath(payload.data.returnTo, "/staff/customers"), "NOT_FOUND");
  }

  const current = customer.loyaltyAccount ?? {
    currentStampCount: 0,
    lifetimeStampCount: 0,
    availableFreeDrinks: 0,
  };

  const nextCurrentStampCount = Math.max(0, current.currentStampCount + payload.data.delta);
  const nextLifetimeStampCount = Math.max(0, current.lifetimeStampCount + payload.data.delta);
  const nextAvailableFreeDrinks = Math.max(0, current.availableFreeDrinks);
  const positiveDelta = Math.max(0, payload.data.delta);
  const loyaltyResult =
    positiveDelta > 0
      ? applyLoyaltyPurchase({
          currentStampCount: current.currentStampCount,
          lifetimeStampCount: current.lifetimeStampCount,
          availableFreeDrinks: current.availableFreeDrinks,
          stampsEarned: positiveDelta,
        })
      : {
          currentStampCount: nextCurrentStampCount,
          lifetimeStampCount: nextLifetimeStampCount,
          availableFreeDrinks: nextAvailableFreeDrinks,
          rewardsCreated: 0,
        };
  const createdRewardIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (customer.loyaltyAccount) {
      await tx.loyaltyAccount.update({
        where: { customerId: customer.id },
        data: {
          currentStampCount: loyaltyResult.currentStampCount,
          lifetimeStampCount: loyaltyResult.lifetimeStampCount,
          availableFreeDrinks: loyaltyResult.availableFreeDrinks,
        },
      });
    } else {
      await tx.loyaltyAccount.create({
        data: {
          customerId: customer.id,
          currentStampCount: loyaltyResult.currentStampCount,
          lifetimeStampCount: loyaltyResult.lifetimeStampCount,
          availableFreeDrinks: loyaltyResult.availableFreeDrinks,
        },
      });
    }

    await tx.loyaltyStampEvent.create({
      data: {
        customerId: customer.id,
        orderId: null,
        type: "ADJUSTED",
        stampDelta: payload.data.delta,
        notes: payload.data.reason || "Ajustement manuel",
      },
    });

    if (loyaltyResult.rewardsCreated > 0) {
      for (let index = 0; index < loyaltyResult.rewardsCreated; index += 1) {
        const reward = await tx.reward.create({
          data: {
            customerId: customer.id,
            type: "FREE_DRINK",
            status: "AVAILABLE",
          },
          select: {
            id: true,
          },
        });
        createdRewardIds.push(reward.id);
      }
    }
  });

  if (loyaltyResult.rewardsCreated > 0) {
    await sendCustomerRewardEarnedNotification({
      userId: customer.userId,
      sourceKey: `manual:${createdRewardIds.join(",")}`,
      rewardsCreated: loyaltyResult.rewardsCreated,
    }).catch(() => undefined);
  }

  revalidatePath(`/staff/customers/${customer.id}`);
  revalidatePath("/app");
  revalidatePath("/rewards");
  redirect(safePath(payload.data.returnTo, `/staff/customers/${customer.id}`));
}

export async function quickAddCustomerStampsAction(input: {
  customerId: string;
  delta: 1 | 2;
}): Promise<StaffCustomerLoyaltyActionResult> {
  await requireStaffSession();
  const payload = quickStampSchema.safeParse(input);

  if (!payload.success) {
    return { ok: false, error: "BAD_FORM" };
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { id: payload.data.customerId },
    include: {
      loyaltyAccount: true,
    },
  });

  if (!customer) {
    return { ok: false, error: "NOT_FOUND" };
  }

  const current = customer.loyaltyAccount ?? {
    currentStampCount: 0,
    lifetimeStampCount: 0,
    availableFreeDrinks: 0,
  };

  const loyaltyResult = applyLoyaltyPurchase({
    currentStampCount: current.currentStampCount,
    lifetimeStampCount: current.lifetimeStampCount,
    availableFreeDrinks: current.availableFreeDrinks,
    stampsEarned: payload.data.delta,
  });
  const createdRewardIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (customer.loyaltyAccount) {
      await tx.loyaltyAccount.update({
        where: { customerId: customer.id },
        data: {
          currentStampCount: loyaltyResult.currentStampCount,
          lifetimeStampCount: loyaltyResult.lifetimeStampCount,
          availableFreeDrinks: loyaltyResult.availableFreeDrinks,
        },
      });
    } else {
      await tx.loyaltyAccount.create({
        data: {
          customerId: customer.id,
          currentStampCount: loyaltyResult.currentStampCount,
          lifetimeStampCount: loyaltyResult.lifetimeStampCount,
          availableFreeDrinks: loyaltyResult.availableFreeDrinks,
        },
      });
    }

    await tx.loyaltyStampEvent.create({
      data: {
        customerId: customer.id,
        orderId: null,
        type: "ADJUSTED",
        stampDelta: payload.data.delta,
        notes: `Ajustement rapide staff (+${payload.data.delta})`,
      },
    });

    if (loyaltyResult.rewardsCreated > 0) {
      for (let index = 0; index < loyaltyResult.rewardsCreated; index += 1) {
        const reward = await tx.reward.create({
          data: {
            customerId: customer.id,
            type: "FREE_DRINK",
            status: "AVAILABLE",
          },
          select: {
            id: true,
          },
        });
        createdRewardIds.push(reward.id);
      }
    }
  });

  if (loyaltyResult.rewardsCreated > 0) {
    await sendCustomerRewardEarnedNotification({
      userId: customer.userId,
      sourceKey: `manual:${createdRewardIds.join(",")}`,
      rewardsCreated: loyaltyResult.rewardsCreated,
    }).catch(() => undefined);
  }

  revalidatePath("/staff/customers");
  revalidatePath(`/staff/customers/${customer.id}`);
  revalidatePath("/app");
  revalidatePath("/rewards");
  revalidatePath("/account");

  return {
    ok: true,
    customerId: customer.id,
    currentStampCount: loyaltyResult.currentStampCount,
    lifetimeStampCount: loyaltyResult.lifetimeStampCount,
    availableFreeDrinks: loyaltyResult.availableFreeDrinks,
    message: `+${payload.data.delta} tampon${payload.data.delta > 1 ? "s" : ""} ajouté${payload.data.delta > 1 ? "s" : ""}.`,
  };
}

export async function quickRedeemCustomerRewardAction(input: {
  customerId: string;
}): Promise<StaffCustomerLoyaltyActionResult> {
  await requireStaffSession();
  const payload = quickRewardSchema.safeParse(input);

  if (!payload.success) {
    return { ok: false, error: "BAD_FORM" };
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { id: payload.data.customerId },
    include: {
      loyaltyAccount: true,
    },
  });

  if (!customer) {
    return { ok: false, error: "NOT_FOUND" };
  }

  const reward = await prisma.reward.findFirst({
    where: {
      customerId: customer.id,
      status: "AVAILABLE",
    },
    orderBy: { createdAt: "asc" },
  });

  if (!reward) {
    return { ok: false, error: "NO_REWARD" };
  }

  const current = customer.loyaltyAccount ?? {
    currentStampCount: 0,
    lifetimeStampCount: 0,
    availableFreeDrinks: 0,
  };

  const nextState = redeemRewardState(current);
  if (!nextState) {
    return { ok: false, error: "NO_REWARD" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.reward.update({
      where: { id: reward.id },
      data: {
        status: "REDEEMED",
        redeemedAt: new Date(),
      },
    });

    if (customer.loyaltyAccount) {
      await tx.loyaltyAccount.update({
        where: { customerId: customer.id },
        data: {
          availableFreeDrinks: nextState.availableFreeDrinks,
        },
      });
    } else {
      await tx.loyaltyAccount.create({
        data: {
          customerId: customer.id,
          currentStampCount: nextState.currentStampCount,
          lifetimeStampCount: nextState.lifetimeStampCount,
          availableFreeDrinks: nextState.availableFreeDrinks,
        },
      });
    }

    await tx.loyaltyStampEvent.create({
      data: {
        customerId: customer.id,
        orderId: reward.sourceOrderId,
        type: "REDEEMED",
        stampDelta: 0,
        notes: "Boisson offerte utilisée au comptoir",
      },
    });
  });

  revalidatePath("/staff/customers");
  revalidatePath(`/staff/customers/${customer.id}`);
  revalidatePath("/app");
  revalidatePath("/rewards");
  revalidatePath("/account");

  return {
    ok: true,
    customerId: customer.id,
    currentStampCount: nextState.currentStampCount,
    lifetimeStampCount: nextState.lifetimeStampCount,
    availableFreeDrinks: nextState.availableFreeDrinks,
    message: "Récompense utilisée.",
  };
}

export async function redeemRewardAction(formData: FormData) {
  const session = await requireCustomerSession();
  const customer = session.user.customerProfile;
  if (!customer) {
    redirectWithError("/rewards", "NOT_AUTHENTICATED");
  }

  const payload = rewardRedeemSchema.safeParse({
    rewardId: formText(formData, "rewardId") || undefined,
    returnTo: formText(formData, "returnTo") || undefined,
  });

  if (!payload.success) {
    redirectWithError("/rewards", "BAD_FORM");
  }

  const reward = await prisma.reward.findFirst({
    where: {
      customerId: customer.id,
      status: "AVAILABLE",
      ...(payload.data.rewardId ? { id: payload.data.rewardId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  if (!reward) {
    redirectWithError(safePath(payload.data.returnTo, "/rewards"), "NO_REWARD");
  }

  await prisma.$transaction(async (tx) => {
    await tx.reward.update({
      where: { id: reward.id },
      data: {
        status: "REDEEMED",
        redeemedAt: new Date(),
      },
    });

    await tx.loyaltyAccount.update({
      where: { customerId: customer.id },
      data: {
        availableFreeDrinks: {
          decrement: 1,
        },
      },
    });

    await tx.loyaltyStampEvent.create({
      data: {
        customerId: customer.id,
        orderId: reward.sourceOrderId,
        type: "REDEEMED",
        stampDelta: 0,
        notes: "Boisson offerte utilisée",
      },
    });
  });

  revalidatePath("/rewards");
  revalidatePath(`/rewards/${reward.id}`);
  revalidatePath("/app");
  redirect(safePath(payload.data.returnTo, `/rewards/${reward.id}`));
}

export async function saveSettingsAction(formData: FormData) {
  await requireStaffSession();
  const payload = settingsSchema.safeParse({
    storeName: formText(formData, "storeName"),
    pickupAddress: formText(formData, "pickupAddress"),
    activeOrderLimitPerCustomer: formText(formData, "activeOrderLimitPerCustomer"),
    unpaidOrderExpiryMinutes: formText(formData, "unpaidOrderExpiryMinutes"),
    newCustomerMaxItems: formText(formData, "newCustomerMaxItems"),
    enableTrustedRegularFlag: formBool(formData, "enableTrustedRegularFlag"),
  });

  if (!payload.success) {
    redirectWithError("/staff/settings", "BAD_FORM");
  }

  const existing = await prisma.storeSettings.findFirst();

  if (existing) {
    await prisma.storeSettings.update({
      where: { id: existing.id },
      data: {
        storeName: payload.data.storeName,
        pickupAddress: payload.data.pickupAddress,
        activeOrderLimitPerCustomer: payload.data.activeOrderLimitPerCustomer,
        unpaidOrderExpiryMinutes: payload.data.unpaidOrderExpiryMinutes,
        newCustomerMaxItems: payload.data.newCustomerMaxItems,
        enableTrustedRegularFlag: payload.data.enableTrustedRegularFlag,
      },
    });
  } else {
    await prisma.storeSettings.create({
      data: {
        storeName: payload.data.storeName,
        pickupAddress: payload.data.pickupAddress,
        activeOrderLimitPerCustomer: payload.data.activeOrderLimitPerCustomer,
        unpaidOrderExpiryMinutes: payload.data.unpaidOrderExpiryMinutes,
        newCustomerMaxItems: payload.data.newCustomerMaxItems,
        enableTrustedRegularFlag: payload.data.enableTrustedRegularFlag,
      },
    });
  }

  revalidatePath("/staff/settings");
  revalidatePath("/menu");
  revalidatePath("/app");
  redirect("/staff/settings?success=1");
}

async function createUniqueSlug(name: string, id?: string) {
  const baseSlug = slugifyMenuName(name) || "article";
  const existingItems = await prisma.menuItem.findMany({
    select: { id: true, slug: true },
  });

  const taken = new Set(
    existingItems.filter((item) => item.id !== id).map((item) => item.slug),
  );

  if (!taken.has(baseSlug)) {
    return baseSlug;
  }

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `${baseSlug}-${Math.floor(Math.random() * 1000)}`;
}

export async function saveMenuItemAction(formData: FormData) {
  await requireStaffSession();
  const payload = menuItemSchema.safeParse({
    id: formText(formData, "id") || undefined,
    name: formText(formData, "name"),
    description: formText(formData, "description"),
    price: formText(formData, "price"),
    displayOrder: formText(formData, "displayOrder"),
    isActive: formBool(formData, "isActive"),
    isQualifying: formBool(formData, "isQualifying"),
    notesRequired: formBool(formData, "notesRequired"),
  });

  if (!payload.success) {
    redirectWithError("/staff/settings", "BAD_FORM");
  }

  const slug = payload.data.id
    ? undefined
    : await createUniqueSlug(payload.data.name);

  if (payload.data.id) {
    await prisma.menuItem.update({
      where: { id: payload.data.id },
      data: {
        name: payload.data.name,
        description: payload.data.description || null,
        price: new Prisma.Decimal(payload.data.price),
        displayOrder: payload.data.displayOrder,
        isActive: payload.data.isActive,
        isQualifying: payload.data.isQualifying,
        notesRequired: payload.data.notesRequired,
      },
    });
  } else {
    await prisma.menuItem.create({
      data: {
        name: payload.data.name,
        slug: slug ?? slugifyMenuName(payload.data.name),
        description: payload.data.description || null,
        price: new Prisma.Decimal(payload.data.price),
        displayOrder: payload.data.displayOrder,
        isActive: payload.data.isActive,
        isQualifying: payload.data.isQualifying,
        notesRequired: payload.data.notesRequired,
      },
    });
  }

  revalidatePath("/staff/settings");
  revalidatePath("/menu");
  revalidatePath("/app");
  redirect("/staff/settings?success=1");
}

export async function toggleMenuItemAction(formData: FormData) {
  await requireStaffSession();
  const id = String(formData.get("id") || "");
  const isActive = String(formData.get("isActive") || "") === "true";

  if (!id) {
    redirectWithError("/staff/settings", "BAD_FORM");
  }

  await prisma.menuItem.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/staff/settings");
  revalidatePath("/menu");
  revalidatePath("/app");
  redirect("/staff/settings?success=1");
}
