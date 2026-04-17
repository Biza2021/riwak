"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { fr } from "@/content/fr";
import type { CustomerOrderSnapshot } from "@/lib/customer-order";
import { formatDateTime, formatTimeOnly } from "@/lib/format";
import { orderStatusLabel, orderStatusTone } from "@/lib/presentation";
import { OrderTimeline } from "./order-timeline";
import { Badge, Card, Screen, SectionHeader, SecondaryButton } from "./ui";

export function CustomerOrderLive({
  initialOrder,
}: {
  initialOrder: CustomerOrderSnapshot;
}) {
  const [order, setOrder] = useState(initialOrder);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    const fetchFreshOrder = async () => {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;

      try {
        const response = await fetch(`/api/orders/${initialOrder.id}`, {
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403 || response.status === 404) {
          window.location.assign("/app");
          return;
        }

        if (!response.ok) {
          return;
        }

        const nextOrder = (await response.json()) as CustomerOrderSnapshot;

        setOrder((currentOrder) =>
          currentOrder.snapshotKey === nextOrder.snapshotKey
            ? currentOrder
            : nextOrder,
        );
      } finally {
        inFlightRef.current = false;
      }
    };

    const timer = window.setInterval(fetchFreshOrder, 3000);
    const handleFocus = () => {
      void fetchFreshOrder();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchFreshOrder();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialOrder.id]);

  return (
    <Screen className="pb-36">
      <div className="space-y-5">
        <SectionHeader
          eyebrow={fr.order.liveStatusTitle}
          title={fr.order.liveStatusTitle}
          description={fr.order.liveStatusBody}
        />

        <Card className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-[#2d1b12]">
                {order.orderItems
                  .map((item) => `${item.menuItemName} x${item.quantity}`)
                  .join(", ")}
              </p>
              <p className="mt-1 text-sm text-[#6d5644]">
                {formatTimeOnly(order.pickupTime)} • {formatDateTime(order.expiresAt)}
              </p>
            </div>
            <Badge tone={orderStatusTone(order.status)}>
              {orderStatusLabel(order.status)}
            </Badge>
          </div>

          <div className="rounded-2xl bg-[#fff6e8] p-4 text-sm leading-6 text-[#6d5644]">
            <p>{fr.order.liveStatusBody}</p>
            <p className="mt-1">Paiement: au comptoir</p>
          </div>

          <OrderTimeline currentStatus={order.status} />

          <Link href="/menu" className="block">
            <SecondaryButton type="button" className="w-full">
              {fr.navCustomer.menu}
            </SecondaryButton>
          </Link>
        </Card>
      </div>
    </Screen>
  );
}
