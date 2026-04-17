import { Prisma, type OrderStatus } from "@prisma/client";

import { prisma } from "./db";
import {
  compareStaffQueueOrders,
  displayCustomerType,
  isActiveOrderStatus,
} from "./domain";

const activeStatuses = ["RECEIVED", "ACCEPTED", "PREPARING", "READY"] as const;
const EXPIRY_SWEEP_INTERVAL_MS = 15_000;

let lastExpirySweepAt = 0;

export async function ensureStoreSettings() {
  const existing = await prisma.storeSettings.findFirst();

  if (existing) {
    return existing;
  }

  return prisma.storeSettings.create({
    data: {
      storeName: "Riwak Coffee",
      pickupAddress: "Boutique principale",
      activeOrderLimitPerCustomer: 1,
      unpaidOrderExpiryMinutes: 30,
      newCustomerMaxItems: 2,
      enableTrustedRegularFlag: true,
    },
  });
}

export async function expireOverdueOrders(options?: { force?: boolean }) {
  const now = new Date();

  if (!options?.force) {
    const nowMs = now.getTime();
    if (nowMs - lastExpirySweepAt < EXPIRY_SWEEP_INTERVAL_MS) {
      return { count: 0 };
    }

    lastExpirySweepAt = nowMs;
  }

  return prisma.order.updateMany({
    where: {
      status: {
        in: activeStatuses as unknown as OrderStatus[],
      },
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });
}

export async function getMenuCatalog(includeInactive = false) {
  return prisma.menuItem.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getMenuItemBySlug(slug: string) {
  return prisma.menuItem.findUnique({
    where: { slug },
  });
}

export async function getMenuItemById(id: string) {
  return prisma.menuItem.findUnique({
    where: { id },
  });
}

export async function getCustomerByPhone(phoneNumber: string) {
  return prisma.customerProfile.findUnique({
    where: { phoneNumber },
    include: {
      loyaltyAccount: true,
    },
  });
}

export async function getCustomerById(customerId: string) {
  return prisma.customerProfile.findUnique({
    where: { id: customerId },
    include: {
      loyaltyAccount: true,
      trustEvents: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          staffUser: true,
        },
      },
    },
  });
}

export async function getCustomerHomeData(customerId: string) {
  await expireOverdueOrders();

  const customer = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      fullName: true,
      loyaltyPin: true,
      customerType: true,
      limitedUntil: true,
      trustedUntil: true,
      loyaltyAccount: {
        select: {
          currentStampCount: true,
          lifetimeStampCount: true,
          availableFreeDrinks: true,
        },
      },
      rewards: {
        where: {
          status: "AVAILABLE",
        },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
      orders: {
        orderBy: { placedAt: "desc" },
        take: 12,
        select: {
          id: true,
          status: true,
          pickupTime: true,
          expiresAt: true,
          placedAt: true,
          orderItems: {
            select: {
              id: true,
              quantity: true,
              menuItem: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!customer) {
    return { customer: null };
  }

  const activeOrder = customer.orders.find((order) =>
    isActiveOrderStatus(order.status),
  );
  const recentCompletedOrder =
    customer.orders.find((order) => order.status === "PICKED_UP") ?? null;
  const quickReorderSource =
    recentCompletedOrder ?? customer.orders.find((order) => order.orderItems.length > 0) ?? null;
  const availableReward =
    customer.rewards.find((reward) => reward.status === "AVAILABLE") ?? null;
  const loyaltyAccount = customer.loyaltyAccount ?? {
    currentStampCount: 0,
    lifetimeStampCount: 0,
    availableFreeDrinks: 0,
  };
  const customerType = displayCustomerType({
    customerType: customer.customerType,
    limitedUntil: customer.limitedUntil,
    trustedUntil: customer.trustedUntil,
  });

  return {
    customer: {
      ...customer,
      customerType,
      activeOrder,
      recentCompletedOrder,
      quickReorderSource,
      availableReward,
      loyaltyAccount,
      progressLabel: `${loyaltyAccount.currentStampCount}/5`,
      rewardLabel: `${loyaltyAccount.availableFreeDrinks}`,
    },
  };
}

export async function getCustomerOrdersData(customerId: string) {
  await expireOverdueOrders();
  return prisma.customerProfile.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      orders: {
        orderBy: { placedAt: "desc" },
        select: {
          id: true,
          status: true,
          placedAt: true,
          pickupTime: true,
          orderItems: {
            select: {
              id: true,
              quantity: true,
              menuItem: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getOrderById(orderId: string) {
  await expireOverdueOrders();
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerId: true,
      status: true,
      pickupTime: true,
      placedAt: true,
      expiresAt: true,
      updatedAt: true,
      totalAmount: true,
      isPaidAtShop: true,
      sugarCount: true,
      notes: true,
      voiceNoteDataUrl: true,
      voiceNoteDurationSec: true,
      customer: {
        select: {
          fullName: true,
          phoneNumber: true,
          customerType: true,
          loyaltyAccount: {
            select: {
              currentStampCount: true,
            },
          },
        },
      },
      orderItems: {
        select: {
          id: true,
          menuItemId: true,
          quantity: true,
          notes: true,
          unitPrice: true,
          menuItem: {
            select: {
              name: true,
            },
          },
        },
      },
      rewards: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
}

export async function getRewardById(rewardId: string) {
  return prisma.reward.findUnique({
    where: { id: rewardId },
    include: {
      customer: {
        include: {
          loyaltyAccount: true,
        },
      },
      sourceOrder: {
        include: {
          orderItems: {
            include: {
              menuItem: true,
            },
          },
        },
      },
    },
  });
}

export async function getCustomerRewardsData(customerId: string) {
  await expireOverdueOrders();
  const customer = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      loyaltyPin: true,
      customerType: true,
      limitedUntil: true,
      trustedUntil: true,
      loyaltyAccount: true,
      rewards: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
      loyaltyEvents: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          stampDelta: true,
          notes: true,
          createdAt: true,
        },
      },
    },
  });

  return customer;
}

export async function getStaffQueueData(
  statusFilter?: string,
  options?: { showDemo?: boolean },
) {
  await expireOverdueOrders();
  const scopedToSingleStatus = Boolean(statusFilter && statusFilter !== "ALL");
  const showDemo = options?.showDemo ?? false;
  const baseWhere: Prisma.OrderWhereInput = showDemo
    ? {}
    : {
        customer: {
          isDemo: false,
        },
      };
  const ordersWhere: Prisma.OrderWhereInput = scopedToSingleStatus
    ? {
        AND: [
          baseWhere,
          {
            status: statusFilter as OrderStatus,
          },
        ],
      }
    : baseWhere;

  const orders = await prisma.order.findMany({
    where: ordersWhere,
    orderBy: [{ placedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      pickupTime: true,
      placedAt: true,
      createdAt: true,
      expiresAt: true,
      totalAmount: true,
      customer: {
        select: {
          fullName: true,
          phoneNumber: true,
          customerType: true,
          loyaltyAccount: {
            select: {
              currentStampCount: true,
            },
          },
        },
      },
      orderItems: {
        select: {
          id: true,
          quantity: true,
          menuItem: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  const queueOrders = scopedToSingleStatus
    ? orders
    : [...orders].sort(compareStaffQueueOrders);

  const counts = {
    RECEIVED: 0,
    ACCEPTED: 0,
    PREPARING: 0,
    READY: 0,
    PICKED_UP: 0,
    CANCELLED: 0,
    EXPIRED: 0,
  } as Record<string, number>;

  const [activeOrders, groupedCountsRaw] = await prisma.$transaction([
    prisma.order.count({
      where: {
        AND: [
          baseWhere,
          {
            status: {
              in: activeStatuses as unknown as OrderStatus[],
            },
          },
        ],
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: baseWhere,
      orderBy: {
        status: "asc",
      },
      _count: {
        status: true,
      },
    }),
  ]);

  const groupedCounts = groupedCountsRaw as Array<{
    status: OrderStatus;
    _count: { status: number };
  }>;

  for (const group of groupedCounts) {
    counts[group.status] = group._count.status;
  }

  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.totalAmount),
    0,
  );

  return {
    orders: queueOrders,
    counts,
    totalRevenue,
    activeOrders,
  };
}

export async function getStaffCustomersData() {
  await expireOverdueOrders();

  const customers = await prisma.customerProfile.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      memberId: true,
      fullName: true,
      phoneNumber: true,
      customerType: true,
      limitedUntil: true,
      trustedUntil: true,
      lastOrderAt: true,
      loyaltyAccount: true,
      orders: {
        orderBy: { placedAt: "desc" },
        take: 1,
        select: {
          placedAt: true,
        },
      },
    },
  });

  return customers.map((customer) => ({
    ...customer,
    customerType: displayCustomerType({
      customerType: customer.customerType,
      limitedUntil: customer.limitedUntil,
      trustedUntil: customer.trustedUntil,
    }),
  }));
}

export async function getStaffCustomerDetail(customerId: string) {
  await expireOverdueOrders();

  const customer = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      memberId: true,
      loyaltyPin: true,
      customerType: true,
      limitedUntil: true,
      trustedUntil: true,
      loyaltyAccount: true,
      orders: {
        orderBy: { placedAt: "desc" },
        select: {
          id: true,
          status: true,
          placedAt: true,
          orderItems: {
            select: {
              id: true,
              quantity: true,
              menuItem: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      loyaltyEvents: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          stampDelta: true,
          notes: true,
          createdAt: true,
        },
      },
    },
  });

  if (!customer) {
    return null;
  }

  const activeOrder = customer.orders.find((order) =>
    isActiveOrderStatus(order.status),
  );

  return {
    ...customer,
    activeOrder,
    customerType: displayCustomerType({
      customerType: customer.customerType,
      limitedUntil: customer.limitedUntil,
      trustedUntil: customer.trustedUntil,
    }),
  };
}

export async function getSettingsPanelData() {
  await expireOverdueOrders();
  const settings = await ensureStoreSettings();
  const menuItems = await prisma.menuItem.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  return { settings, menuItems };
}
