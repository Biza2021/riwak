"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PICKUP_OPTIONS, type PickupOptionMinutes } from "@/lib/domain";
import { pickupLabel } from "@/lib/presentation";
import { PrimaryButton, SecondaryButton, TextAreaField } from "./ui";

export function OrderConfigurator({
  menuItemId,
  menuItemSlug,
  defaultQuantity = 1,
  defaultPickupMinutes = 10,
  returnTo = "/menu",
}: {
  menuItemId: string;
  menuItemSlug: string;
  defaultQuantity?: number;
  defaultPickupMinutes?: PickupOptionMinutes;
  returnTo?: string;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [pickupMinutes, setPickupMinutes] =
    useState<PickupOptionMinutes>(defaultPickupMinutes);
  const [notes, setNotes] = useState("");

  function goToReview() {
    const params = new URLSearchParams({
      menuItemId,
      menuItemSlug,
      quantity: String(quantity),
      pickupMinutes: String(pickupMinutes),
      notes,
      returnTo,
    });

    router.push(`/order/review?${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#533728]">Quantité</p>
        <div className="flex items-center gap-3">
          <SecondaryButton
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
          >
            -
          </SecondaryButton>
          <div className="min-w-16 rounded-2xl bg-[#fff4de] px-4 py-3 text-center text-lg font-semibold text-[#2d1b12]">
            {quantity}
          </div>
          <SecondaryButton
            type="button"
            onClick={() => setQuantity((value) => Math.min(9, value + 1))}
          >
            +
          </SecondaryButton>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#533728]">Retrait</p>
        <div className="grid grid-cols-2 gap-2">
          {PICKUP_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPickupMinutes(option)}
              className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                pickupMinutes === option
                  ? "bg-[#8c6239] text-white"
                  : "bg-[#f4eadc] text-[#533728]"
              }`}
            >
              {pickupLabel(option)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#533728]">Notes</p>
        <TextAreaField
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex. peu sucré, sans mousse"
        />
      </div>

      <PrimaryButton type="button" className="w-full" onClick={goToReview}>
        Continuer
      </PrimaryButton>
    </div>
  );
}
