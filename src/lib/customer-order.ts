import type { OrderStatus } from "./domain";

export type CustomerOrderSnapshot = {
  id: string;
  status: OrderStatus;
  pickupTime: string;
  expiresAt: string;
  updatedAt: string;
  orderItems: Array<{
    id: string;
    menuItemName: string;
    quantity: number;
  }>;
  snapshotKey: string;
};

type RawCustomerOrder = {
  id: string;
  status: OrderStatus;
  pickupTime: Date;
  expiresAt: Date;
  updatedAt: Date;
  orderItems: Array<{
    id: string;
    quantity: number;
    menuItem: {
      name: string;
    };
  }>;
};

export function serializeCustomerOrder(
  order: RawCustomerOrder,
): CustomerOrderSnapshot {
  return {
    id: order.id,
    status: order.status,
    pickupTime: order.pickupTime.toISOString(),
    expiresAt: order.expiresAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    orderItems: order.orderItems.map((item) => ({
      id: item.id,
      menuItemName: item.menuItem.name,
      quantity: item.quantity,
    })),
    snapshotKey: [
      order.id,
      order.status,
      order.pickupTime.toISOString(),
      order.expiresAt.toISOString(),
      order.updatedAt.toISOString(),
    ].join(":"),
  };
}
