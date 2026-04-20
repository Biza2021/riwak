import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffCustomerDetailControls } from "@/components/staff-customer-detail-controls";
import { StaffTopNav } from "@/components/navigation";
import {
  Badge,
  Card,
  Notice,
  Screen,
  SectionHeader,
  SecondaryButton,
} from "@/components/ui";
import { fr } from "@/content/fr";
import { LOYALTY_STAMP_THRESHOLD } from "@/lib/domain";
import { formatDateTime, formatMemberId } from "@/lib/format";
import { getStaffCustomerDetail } from "@/lib/queries";
import {
  customerTypeLabel,
  customerTypeTone,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/presentation";
import { requireStaffSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StaffCustomerDetailPage({
  params,
}: {
  params?: Promise<{ id: string }>;
}) {
  await requireStaffSession();
  const resolvedParams = (await params) ?? { id: "" };
  const customer = await getStaffCustomerDetail(resolvedParams.id);

  if (!customer) {
    redirect("/staff/customers");
  }

  const currentPath = `/staff/customers/${customer.id}`;

  return (
    <>
      <Screen className="pb-40">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.staff.customerTitle}
            title={customer.fullName}
            description={customer.phoneNumber}
          />

          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#8c6239]">{fr.common.memberId}</p>
                <p className="mt-1 text-lg font-semibold text-[#2d1b12]">
                  {formatMemberId(customer.memberId)}
                </p>
              </div>
              <Badge tone={customerTypeTone(customer.customerType)}>
                {customerTypeLabel(customer.customerType)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                  Tampons
                </p>
                <p className="mt-2 text-xl font-semibold text-[#2d1b12]">
                  {customer.loyaltyAccount?.currentStampCount ?? 0}/{LOYALTY_STAMP_THRESHOLD}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                  Récompenses
                </p>
                <p className="mt-2 text-xl font-semibold text-[#2d1b12]">
                  {customer.loyaltyAccount?.availableFreeDrinks ?? 0}
                </p>
              </div>
            </div>

            {customer.activeOrder ? (
              <Notice tone="gold">
                Commande active: {customer.activeOrder.orderItems
                  .map((item) => `${item.menuItem.name} x${item.quantity}`)
                  .join(", ")}
              </Notice>
            ) : null}

            <details className="rounded-2xl border border-[#e3d1ba] bg-[#fcf7ef] px-4 py-3 text-sm text-[#5f4634]">
              <summary className="cursor-pointer list-none font-semibold text-[#8c6239]">
                {fr.staff.recoveryCodeTitle}
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xl font-semibold text-[#2d1b12]">
                  {customer.loyaltyPin}
                </p>
                <p className="leading-6 text-[#6d5644]">
                  {fr.staff.recoveryCodeBody}
                </p>
              </div>
            </details>
          </Card>

          <StaffCustomerDetailControls
            customerId={customer.id}
            currentPath={currentPath}
            customerType={customer.customerType}
          />

          <Card className="space-y-3 p-5">
            <p className="text-sm font-semibold text-[#8c6239]">Dernières commandes</p>
            {customer.orders.length ? (
              <div className="space-y-3">
                {customer.orders.slice(0, 6).map((order) => (
                  <Link key={order.id} href={`/staff/orders/${order.id}`} className="block">
                    <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#2d1b12]">
                            {order.orderItems
                              .map((item) => `${item.menuItem.name} x${item.quantity}`)
                              .join(", ")}
                          </p>
                          <p className="mt-1 text-sm text-[#6d5644]">
                            {formatDateTime(order.placedAt)}
                          </p>
                        </div>
                        <Badge tone={orderStatusTone(order.status)}>
                          {orderStatusLabel(order.status)}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Notice>Aucune commande pour ce client.</Notice>
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <p className="text-sm font-semibold text-[#8c6239]">Historique fidélité</p>
            {customer.loyaltyEvents.length ? (
              <div className="space-y-3">
                {customer.loyaltyEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-[#f8f1e7] px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#2d1b12]">
                          {event.type === "EARNED"
                            ? fr.loyalty.earned
                            : event.type === "REDEEMED"
                              ? fr.loyalty.redeemed
                              : fr.loyalty.adjusted}
                        </p>
                        <p className="mt-1 text-[#6d5644]">{formatDateTime(event.createdAt)}</p>
                      </div>
                      <Badge tone={event.type === "ADJUSTED" ? "blue" : "gold"}>
                        {event.stampDelta > 0 ? `+${event.stampDelta}` : `${event.stampDelta}`}
                      </Badge>
                    </div>
                    {event.notes ? (
                      <p className="mt-2 text-xs leading-5 text-[#6d5644]">{event.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <Notice>Aucun historique fidélité.</Notice>
            )}
          </Card>

          <Link href="/staff/customers">
            <SecondaryButton type="button" className="w-full">
              {fr.actions.back}
            </SecondaryButton>
          </Link>
        </div>
      </Screen>
      <StaffTopNav
        items={[
          { href: "/staff/orders", label: fr.navStaff.orders },
          { href: "/staff/customers", label: fr.navStaff.customers, active: true },
          { href: "/staff/settings", label: fr.navStaff.settings },
        ]}
      />
    </>
  );
}
