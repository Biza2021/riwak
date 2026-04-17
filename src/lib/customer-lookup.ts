import { formatMemberId } from "./format";

export type SearchableCustomer = {
  memberId: number;
  fullName: string;
  phoneNumber: string;
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isNumericLookup(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^[#\d\s()+-]+$/.test(trimmed);
}

export function filterStaffCustomers<T extends SearchableCustomer>(
  customers: T[],
  query: string,
) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return customers;
  }

  const normalizedQuery = trimmedQuery.toLocaleLowerCase("fr-MA");
  const queryDigits = normalizeDigits(trimmedQuery);

  if (queryDigits && isNumericLookup(trimmedQuery)) {
    const exactMemberId = Number.parseInt(queryDigits, 10);
    const exactMemberMatches = customers.filter(
      (customer) => customer.memberId === exactMemberId,
    );

    if (exactMemberMatches.length) {
      return exactMemberMatches;
    }
  }

  return [...customers]
    .map((customer) => {
      const phoneDigits = normalizeDigits(customer.phoneNumber);
      const memberLabel = formatMemberId(customer.memberId).toLocaleLowerCase("fr-MA");
      const memberValue = String(customer.memberId);
      const name = customer.fullName.toLocaleLowerCase("fr-MA");

      let score = Number.POSITIVE_INFINITY;

      if (name.startsWith(normalizedQuery)) {
        score = 10;
      } else if (name.includes(normalizedQuery)) {
        score = 20;
      } else if (queryDigits && phoneDigits.includes(queryDigits)) {
        score = 30;
      } else if (queryDigits && memberValue.startsWith(queryDigits)) {
        score = 40;
      } else if (memberLabel.includes(normalizedQuery)) {
        score = 50;
      }

      return { customer, score };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.customer.fullName.localeCompare(right.customer.fullName, "fr");
    })
    .map((entry) => entry.customer);
}
