import type { CustomerType } from "./domain";

export type StaffCustomerCardSnapshot = {
  id: string;
  memberId: number;
  fullName: string;
  phoneNumber: string;
  customerType: CustomerType;
  currentStampCount: number;
  lifetimeStampCount: number;
  availableFreeDrinks: number;
  lastOrderAt: string | null;
};

export type StaffStampRequestSnapshot = {
  id: string;
  customerId: string;
  customerName: string;
  memberId: number;
  createdAt: string;
};

type RawStaffCustomer = {
  id: string;
  memberId: number;
  fullName: string;
  phoneNumber: string;
  customerType: CustomerType;
  lastOrderAt: Date | null;
  loyaltyAccount: {
    currentStampCount: number;
    lifetimeStampCount: number;
    availableFreeDrinks: number;
  } | null;
  orders: Array<{
    placedAt: Date;
  }>;
};

type RawStaffStampRequest = {
  id: string;
  customerId: string;
  createdAt: Date;
  customer: {
    memberId: number;
    fullName: string;
  };
};

export function serializeStaffCustomers(
  customers: RawStaffCustomer[],
): StaffCustomerCardSnapshot[] {
  return customers.map((customer) => ({
    id: customer.id,
    memberId: customer.memberId,
    fullName: customer.fullName,
    phoneNumber: customer.phoneNumber,
    customerType: customer.customerType,
    currentStampCount: customer.loyaltyAccount?.currentStampCount ?? 0,
    lifetimeStampCount: customer.loyaltyAccount?.lifetimeStampCount ?? 0,
    availableFreeDrinks: customer.loyaltyAccount?.availableFreeDrinks ?? 0,
    lastOrderAt:
      customer.lastOrderAt?.toISOString() ??
      customer.orders[0]?.placedAt.toISOString() ??
      null,
  }));
}

export function serializeStaffStampRequests(
  requests: RawStaffStampRequest[],
): StaffStampRequestSnapshot[] {
  return requests.map((request) => ({
    id: request.id,
    customerId: request.customerId,
    customerName: request.customer.fullName,
    memberId: request.customer.memberId,
    createdAt: request.createdAt.toISOString(),
  }));
}
