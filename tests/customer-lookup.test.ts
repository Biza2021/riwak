import { describe, expect, it } from "vitest";

import { filterStaffCustomers } from "../src/lib/customer-lookup";
import { formatMemberId } from "../src/lib/format";

const customers = [
  {
    memberId: 1,
    fullName: "Amina El Fassi",
    phoneNumber: "+212600000001",
  },
  {
    memberId: 12,
    fullName: "Youssef Benali",
    phoneNumber: "+212611112222",
  },
  {
    memberId: 20,
    fullName: "Hamid Othmani",
    phoneNumber: "+212600001212",
  },
];

describe("customer lookup", () => {
  it("formats member ids for staff and customers", () => {
    expect(formatMemberId(1)).toBe("#0001");
    expect(formatMemberId(27)).toBe("#0027");
  });

  it("prioritizes an exact member id numeric match", () => {
    const result = filterStaffCustomers(customers, "12");

    expect(result.map((customer) => customer.fullName)).toEqual(["Youssef Benali"]);
  });

  it("falls back to phone lookup when no member id matches", () => {
    const result = filterStaffCustomers(customers, "1111");

    expect(result.map((customer) => customer.fullName)).toEqual(["Youssef Benali"]);
  });

  it("supports customer name search", () => {
    const result = filterStaffCustomers(customers, "hamid");

    expect(result.map((customer) => customer.fullName)).toEqual(["Hamid Othmani"]);
  });
});
