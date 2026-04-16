import { Prisma, type OrderStatus } from "@prisma/client";

import { prisma } from "./db";
import { displayCustomerType, isActiveOrderStatus } from "./domain";
import { formatCurrency } from "./format";

const activeStatuses = ["RECEIVED", "ACCEPTED", "PREPARING", "READY"] as const;

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

export async function expireOverdueOrders() {
  const now = new Date();

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
  const settings = await ensureStoreSettings();

  const customer = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    include: {
      user: true,
      loyaltyAccount: true,
      rewards: {
        orderBy: { createdAt: "desc" },
      },
      trustEvents: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          staffUser: true,
        },
      },
      orders: {
        orderBy: { placedAt: "desc" },
        take: 12,
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

  if (!customer) {
    return { settings, customer: null };
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
    settings,
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
    include: {
      orders: {
        orderBy: { placedAt: "desc" },
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

export async function getOrderById(orderId: string) {
  await expireOverdueOrders();
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        include: {
          loyaltyAccount: true,
          user: true,
        },
      },
      orderItems: {
        include: {
          menuItem: true,
        },
      },
      rewards: true,
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
    include: {
      loyaltyAccount: true,
      rewards: {
        orderBy: { createdAt: "desc" },
      },
      loyaltyEvents: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  menuItem: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return customer;
}

export async function getStaffQueueData(statusFilter?: string) {
  await expireOverdueOrders();
  const settings = await ensureStoreSettings();

  const orders = await prisma.order.findMany({
    where:
      statusFilter && statusFilter !== "ALL"
        ? { status: statusFilter as OrderStatus }
        : undefined,
    orderBy: [{ placedAt: "desc" }],
    include: {
      customer: {
        include: {
          loyaltyAccount: true,
        },
      },
      orderItems: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  const allOrders = await prisma.order.findMany({
    where: {
      status: {
        in: activeStatuses as unknown as OrderStatus[],
      },
    },
    select: {
      status: true,
      id: true,
    },
  });

  const counts = {
    RECEIVED: 0,
    ACCEPTED: 0,
    PREPARING: 0,
    READY: 0,
    PICKED_UP: 0,
    CANCELLED: 0,
    EXPIRED: 0,
  } as Record<string, number>;

  for (const order of await prisma.order.findMany({ select: { status: true } })) {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
  }

  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.totalAmount),
    0,
  );

  return {
    settings,
    orders,
    counts,
    totalRevenue,
    activeOrders: allOrders.length,
  };
}

export async function getStaffCustomersData() {
  await expireOverdueOrders();

  const customers = await prisma.customerProfile.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      loyaltyAccount: true,
      orders: {
        orderBy: { placedAt: "desc" },
        take: 3,
        include: {
          orderItems: {
            include: {
              menuItem: true,
            },
          },
        },
      },
      trustEvents: {
        orderBy: { createdAt: "desc" },
        take: 1,
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
    include: {
      user: true,
      loyaltyAccount: true,
      orders: {
        orderBy: { placedAt: "desc" },
        include: {
          orderItems: {
            include: {
              menuItem: true,
            },
          },
        },
      },
      loyaltyEvents: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  menuItem: true,
                },
              },
            },
          },
        },
      },
      rewards: {
        orderBy: { createdAt: "desc" },
      },
      trustEvents: {
        orderBy: { createdAt: "desc" },
        include: {
          staffUser: true,
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

export async function getStaffLoyaltyOverview() {
  await expireOverdueOrders();

  const accounts = await prisma.loyaltyAccount.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      customer: {
        include: {
          orders: {
            orderBy: { placedAt: "desc" },
            take: 2,
            include: {
              orderItems: {
                include: {
                  menuItem: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const stats = await prisma.loyaltyStampEvent.groupBy({
    by: ["type"],
    _count: true,
  });

  return {
    accounts,
    stats,
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

export async function getOrderQueueMetrics() {
  const orders = await prisma.order.findMany({
    select: {
      status: true,
      totalAmount: true,
    },
  });

  const totals = {
    RECEIVED: 0,
    ACCEPTED: 0,
    PREPARING: 0,
    READY: 0,
    PICKED_UP: 0,
    CANCELLED: 0,
    EXPIRED: 0,
  } as Record<string, number>;

  for (const order of orders) {
    totals[order.status] = (totals[order.status] ?? 0) + 1;
  }

  return {
    totals,
    revenue: orders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
  };
}

export function getOrderTotalLabel(totalAmount: Prisma.Decimal | number | string) {
  return formatCurrency(totalAmount);
}
