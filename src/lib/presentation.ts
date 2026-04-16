import { fr } from "@/content/fr";
import type { CustomerType, OrderStatus, PickupOptionMinutes } from "./domain";

export function customerTypeLabel(type: CustomerType) {
  const map: Record<CustomerType, string> = {
    NEW: fr.customerTypes.new,
    RETURNING: fr.customerTypes.returning,
    TRUSTED: fr.customerTypes.trusted,
    LIMITED: fr.customerTypes.limited,
  };

  return map[type];
}

export function orderStatusLabel(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    RECEIVED: fr.statuses.received,
    ACCEPTED: fr.statuses.accepted,
    PREPARING: fr.statuses.preparing,
    READY: fr.statuses.ready,
    PICKED_UP: fr.statuses.pickedUp,
    CANCELLED: fr.statuses.cancelled,
    EXPIRED: fr.statuses.expired,
  };

  return map[status];
}

export function customerTypeTone(type: CustomerType) {
  const map: Record<CustomerType, "neutral" | "gold" | "green" | "red" | "blue"> = {
    NEW: "neutral",
    RETURNING: "blue",
    TRUSTED: "green",
    LIMITED: "red",
  };

  return map[type];
}

export function orderStatusTone(status: OrderStatus) {
  const map: Record<OrderStatus, "neutral" | "gold" | "green" | "red" | "blue"> =
    {
      RECEIVED: "blue",
      ACCEPTED: "gold",
      PREPARING: "gold",
      READY: "green",
      PICKED_UP: "neutral",
      CANCELLED: "red",
      EXPIRED: "red",
    };

  return map[status];
}

export function pickupLabel(minutes: PickupOptionMinutes) {
  if (minutes === 0) {
    return "Maintenant";
  }

  return `Dans ${minutes} min`;
}

export function trustToneFromType(type: string) {
  if (type === "LIMITED") return "red";
  if (type === "TRUSTED") return "green";
  if (type === "RETURNING") return "blue";
  return "neutral";
}
