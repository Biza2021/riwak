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
