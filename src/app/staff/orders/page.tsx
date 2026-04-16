import Link from "next/link";

import { AutoRefresh } from "@/components/auto-refresh";
import { StaffTopNav } from "@/components/navigation";
import {
  Screen,
  Card,
  SectionHeader,
  Badge,
  MetricCard,
  EmptyState,
} from "@/components/ui";
import { fr } from "@/content/fr";
import { getStaffQueueData } from "@/lib/queries";
import { requireStaffSession } from "@/lib/session";
import { formatDateTime, formatTimeOnly, formatCurrency } from "@/lib/format";
import {
  customerTypeLabel,
  customerTypeTone,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/presentation";

export const dynamic = "force-dynamic";

function statusFilterLinks(activeStatus: string, counts: Record<string, number>) {
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
          href={`/staff/orders?status=${filter.key}`}
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

export default async function StaffOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffSession();
  const params = (await searchParams) ?? {};
  const status = typeof params.status === "string" ? params.status : "ALL";
  const data = await getStaffQueueData(status);

  return (
    <>
      <Screen className="pb-24">
        <AutoRefresh intervalMs={8000} />
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.staff.queueTitle}
            title={fr.staff.queueTitle}
            description={fr.staff.queueSubtitle}
          />

          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              title={fr.staff.metricsTitle}
              value={data.orders.length}
              detail="commandes visibles"
              tone="blue"
            />
            <MetricCard
              title="CA"
              value={formatCurrency(data.totalRevenue)}
              detail="sur la file affichée"
              tone="gold"
            />
          </div>

          <Card className="space-y-3 p-4">
            <p className="text-sm font-semibold text-[#8c6239]">{fr.staff.filtersTitle}</p>
            {statusFilterLinks(status, data.counts)}
          </Card>

          <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#8c6239]">
                {fr.staff.queueTitle}
              </p>
              <Badge tone="blue">{data.activeOrders} actives</Badge>
            </div>
            {data.orders.length ? (
              <div className="space-y-3">
                {data.orders.map((order) => (
                  <Link key={order.id} href={`/staff/orders/${order.id}`} className="block">
                    <div className="rounded-2xl border border-[#e7d4bc] bg-[#fff8ef] p-4 transition active:scale-[0.99]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#2d1b12]">
                            {order.customer.fullName}
                          </p>
                          <p className="mt-1 text-sm text-[#6d5644]">
                            {order.customer.phoneNumber}
                          </p>
                        </div>
                        <Badge tone={orderStatusTone(order.status)}>
                          {orderStatusLabel(order.status)}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone={customerTypeTone(order.customer.customerType)}>
                          {customerTypeLabel(order.customer.customerType)}
                        </Badge>
                        {order.customer.loyaltyAccount ? (
                          <Badge tone="gold">
                            {order.customer.loyaltyAccount.currentStampCount}/5
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-3 text-sm leading-6 text-[#5f4634]">
                        <p>
                          {order.orderItems
                            .map((item) => `${item.menuItem.name} x${item.quantity}`)
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
                ))}
              </div>
            ) : (
              <EmptyState title={fr.empty.orders} />
            )}
          </Card>
        </div>
      </Screen>
      <StaffTopNav
        items={[
          { href: "/staff/orders", label: fr.navStaff.orders, active: true },
          { href: "/staff/customers", label: fr.navStaff.customers },
          { href: "/staff/loyalty", label: fr.navStaff.loyalty },
          { href: "/staff/settings", label: fr.navStaff.settings },
        ]}
      />
    </>
  );
}
