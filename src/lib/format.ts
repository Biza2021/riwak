export function formatCurrency(amount: number | string | { toString(): string }) {
  const numeric =
    typeof amount === "number" ? amount : Number.parseFloat(amount.toString());

  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("fr-MA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTimeOnly(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeMinutes(target: Date | string, now = new Date()) {
  const targetDate = target instanceof Date ? target : new Date(target);
  const diff = Math.round((targetDate.getTime() - now.getTime()) / 60_000);

  if (Math.abs(diff) < 1) {
    return "Maintenant";
  }

  if (diff > 0) {
    return `Dans ${diff} min`;
  }

  return `Il y a ${Math.abs(diff)} min`;
}
