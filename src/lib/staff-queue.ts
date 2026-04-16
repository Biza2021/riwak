import type { CustomerType, OrderStatus } from "./domain";

export type StaffQueueOrderSnapshot = {
  id: string;
  status: OrderStatus;
  pickupTime: string;
  placedAt: string;
  expiresAt: string;
  customer: {
    fullName: string;
    phoneNumber: string;
    customerType: CustomerType;
    currentStampCount: number | null;
  };
  orderItems: Array<{
    id: string;
    menuItemName: string;
    quantity: number;
  }>;
};

export type StaffQueueSnapshot = {
  counts: Record<string, number>;
  totalRevenue: number;
  activeOrders: number;
  orders: StaffQueueOrderSnapshot[];
  snapshotKey: string;
};

type RawStaffQueueData = {
  counts: Record<string, number>;
  totalRevenue: number;
  activeOrders: number;
  orders: Array<{
    id: string;
    status: OrderStatus;
    pickupTime: Date;
    placedAt: Date;
    expiresAt: Date;
    customer: {
      fullName: string;
      phoneNumber: string;
      customerType: CustomerType;
      loyaltyAccount?: {
        currentStampCount: number;
      } | null;
    };
    orderItems: Array<{
      id: string;
      quantity: number;
      menuItem: {
        name: string;
      };
    }>;
  }>;
};

export function serializeStaffQueueData(
  data: RawStaffQueueData,
): StaffQueueSnapshot {
  const orders = data.orders.map((order) => ({
    id: order.id,
    status: order.status,
    pickupTime: order.pickupTime.toISOString(),
    placedAt: order.placedAt.toISOString(),
    expiresAt: order.expiresAt.toISOString(),
    customer: {
      fullName: order.customer.fullName,
      phoneNumber: order.customer.phoneNumber,
      customerType: order.customer.customerType,
      currentStampCount: order.customer.loyaltyAccount?.currentStampCount ?? null,
    },
    orderItems: order.orderItems.map((item) => ({
      id: item.id,
      menuItemName: item.menuItem.name,
      quantity: item.quantity,
    })),
  }));

  const snapshotKey = [
    orders
      .map((order) =>
        [
          order.id,
          order.status,
          order.placedAt,
          order.expiresAt,
          order.customer.currentStampCount ?? "none",
        ].join(":"),
      )
      .join("|"),
    data.activeOrders,
    data.totalRevenue,
    JSON.stringify(data.counts),
  ].join("#");

  return {
    counts: data.counts,
    totalRevenue: data.totalRevenue,
    activeOrders: data.activeOrders,
    orders,
    snapshotKey,
  };
}
