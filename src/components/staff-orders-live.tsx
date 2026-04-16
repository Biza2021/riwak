"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { fr } from "@/content/fr";
import { formatCurrency, formatDateTime, formatTimeOnly } from "@/lib/format";
import {
  customerTypeLabel,
  customerTypeTone,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/presentation";
import type { StaffQueueSnapshot } from "@/lib/staff-queue";
import {
  Badge,
  Card,
  EmptyState,
  MetricCard,
  Notice,
  SectionHeader,
} from "./ui";

function buildFilterHref(key: string, showDemo: boolean) {
  const params = new URLSearchParams();
  params.set("status", key);

  if (showDemo) {
    params.set("showDemo", "1");
  }

  return `/staff/orders?${params.toString()}`;
}

function statusFilterLinks(
  activeStatus: string,
  counts: Record<string, number>,
  showDemo: boolean,
) {
  const filters = [
    { key: "ALL", label: "Tout" },
    { key: "RECEIVED", label: fr.statuses.received },
    { key: "ACCEPTED", label: fr.statuses.accepted },
    { key: "PREPARING", label: fr.statuses.preparing },
    { key: "READY", label: fr.statuses.ready },
    { key: "PICKED_UP", label: fr.statuses.pickedUp },
    { key: "CANCELLED", label: fr.statuses.cancelled },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {filters.map((filter) => (
        <Link
          key={filter.key}
          href={buildFilterHref(filter.key, showDemo)}
          className={`rounded-2xl px-3 py-3 text-center text-sm font-semibold transition ${
            activeStatus === filter.key
              ? "bg-[#2d1b12] text-white"
              : "bg-[#f3eadf] text-[#53402e]"
          }`}
        >
          {filter.label}
          <span className="ml-1 opacity-70">{counts[filter.key] ?? 0}</span>
        </Link>
      ))}
    </div>
  );
}

export function StaffOrdersLive({
  initialData,
  status,
  showDemo,
}: {
  initialData: StaffQueueSnapshot;
  status: string;
  showDemo: boolean;
}) {
  const [queueData, setQueueData] = useState(initialData);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [highlightedOrderIds, setHighlightedOrderIds] = useState<string[]>([]);
  const inFlightRef = useRef(false);
  const bannerTimeoutRef = useRef<number | null>(null);
  const highlightTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    setQueueData(initialData);
    setNewOrderCount(0);
    setHighlightedOrderIds([]);
  }, [initialData]);

  useEffect(() => {
    const clearTimers = () => {
      if (bannerTimeoutRef.current) {
        window.clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = null;
      }

      for (const timeoutId of highlightTimeoutsRef.current) {
        window.clearTimeout(timeoutId);
      }
      highlightTimeoutsRef.current = [];
    };

    const fetchFreshQueue = async () => {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;

      try {
        const params = new URLSearchParams();
        params.set("status", status);
        if (showDemo) {
          params.set("showDemo", "1");
        }

        const response = await fetch(`/api/staff/orders?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const nextData = (await response.json()) as StaffQueueSnapshot;

        setQueueData((currentData) => {
          if (currentData.snapshotKey === nextData.snapshotKey) {
            return currentData;
          }

          const currentIds = new Set(currentData.orders.map((order) => order.id));
          const newIds = nextData.orders
            .map((order) => order.id)
            .filter((id) => !currentIds.has(id));

          if (newIds.length) {
            clearTimers();
            setNewOrderCount(newIds.length);
            setHighlightedOrderIds((currentIdsState) => [
              ...new Set([...currentIdsState, ...newIds]),
            ]);

            const highlightTimeout = window.setTimeout(() => {
              setHighlightedOrderIds((currentIdsState) =>
                currentIdsState.filter((id) => !newIds.includes(id)),
              );
            }, 6000);

            const bannerTimeout = window.setTimeout(() => {
              setNewOrderCount(0);
            }, 6000);

            highlightTimeoutsRef.current.push(highlightTimeout);
            bannerTimeoutRef.current = bannerTimeout;
          }

          return nextData;
        });
      } finally {
        inFlightRef.current = false;
      }
    };

    const timer = window.setInterval(fetchFreshQueue, 3000);
    const handleFocus = () => {
      void fetchFreshQueue();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchFreshQueue();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimers();
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [showDemo, status]);

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow={fr.staff.queueTitle}
        title={fr.staff.queueTitle}
        description={fr.staff.queueSubtitle}
      />

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          title={fr.staff.metricsTitle}
          value={queueData.orders.length}
          detail="commandes visibles"
          tone="blue"
        />
        <MetricCard
          title="CA"
          value={formatCurrency(queueData.totalRevenue)}
          detail="sur la file affichée"
          tone="gold"
        />
      </div>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[#8c6239]">{fr.staff.filtersTitle}</p>
        {statusFilterLinks(status, queueData.counts, showDemo)}
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#8c6239]">
            {fr.staff.queueTitle}
          </p>
          <div className="flex items-center gap-2">
            {newOrderCount ? (
              <Badge tone="green">
                {newOrderCount === 1
                  ? "Nouvelle commande"
                  : `${newOrderCount} nouvelles commandes`}
              </Badge>
            ) : null}
            <Badge tone="blue">{queueData.activeOrders} actives</Badge>
          </div>
        </div>

        {newOrderCount ? (
          <Notice tone="green">
            {newOrderCount === 1
              ? "Une nouvelle commande vient d'arriver en haut de la file."
              : `${newOrderCount} nouvelles commandes viennent d'arriver en haut de la file.`}
          </Notice>
        ) : null}

        {queueData.orders.length ? (
          <div className="space-y-3">
            {queueData.orders.map((order) => {
              const isHighlighted = highlightedOrderIds.includes(order.id);

              return (
                <Link key={order.id} href={`/staff/orders/${order.id}`} className="block">
                  <div
                    className={`rounded-2xl border p-4 transition active:scale-[0.99] ${
                      isHighlighted
                        ? "border-[#d8b36f] bg-[#fff1d6] shadow-[0_0_0_3px_rgba(216,179,111,0.22)]"
                        : "border-[#e7d4bc] bg-[#fff8ef]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#2d1b12]">
                          {order.customer.fullName}
                        </p>
                        <p className="mt-1 text-sm text-[#6d5644]">
                          {order.customer.phoneNumber}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {isHighlighted ? <Badge tone="green">Nouvelle commande</Badge> : null}
                        <Badge tone={orderStatusTone(order.status)}>
                          {orderStatusLabel(order.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={customerTypeTone(order.customer.customerType)}>
                        {customerTypeLabel(order.customer.customerType)}
                      </Badge>
                      {order.customer.currentStampCount !== null ? (
                        <Badge tone="gold">{order.customer.currentStampCount}/5</Badge>
                      ) : null}
                    </div>

                    <div className="mt-3 text-sm leading-6 text-[#5f4634]">
                      <p>
                        {order.orderItems
                          .map((item) => `${item.menuItemName} x${item.quantity}`)
                          .join(", ")}
                      </p>
                      <p className="mt-1">
                        {formatTimeOnly(order.pickupTime)} - {formatDateTime(order.placedAt)}
                      </p>
                      <p className="mt-1">
                        {fr.staff.activeUnpaidLabel}: {formatDateTime(order.expiresAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState title={fr.empty.orders} />
        )}
      </Card>
    </div>
  );
}
