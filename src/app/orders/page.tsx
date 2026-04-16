import Link from "next/link";

import { CustomerBottomNav } from "@/components/navigation";
import { Screen, Card, SectionHeader, Badge, EmptyState, SecondaryButton } from "@/components/ui";
import { fr } from "@/content/fr";
import { getCustomerOrdersData } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";
import { formatDateTime, formatTimeOnly } from "@/lib/format";
import { orderStatusLabel, orderStatusTone } from "@/lib/presentation";

export const dynamic = "force-dynamic";

export default async function OrdersHistoryPage() {
  const session = await requireCustomerSession();
  const customer = await getCustomerOrdersData(session.user.customerProfile!.id);

  if (!customer) {
    return null;
  }

  return (
    <>
      <Screen className="pb-36">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.history.title}
            title={fr.history.title}
            description={fr.history.subtitle}
          />

          {customer.orders.length ? (
            <div className="space-y-3">
              {customer.orders.map((order) => (
                <Card key={order.id} className="space-y-3 p-5">
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
                  <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3 text-sm leading-6 text-[#5f4634]">
                    <p>{formatTimeOnly(order.pickupTime)}</p>
                    <p className="mt-1">Commande #{order.id.slice(0, 8)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/orders/${order.id}`} className="flex-1">
                      <SecondaryButton type="button" className="w-full">
                        {fr.actions.viewOrder}
                      </SecondaryButton>
                    </Link>
                    {order.orderItems.length ? (
                      <Link href={`/order/review?repeatFrom=${order.id}`} className="flex-1">
                        <SecondaryButton type="button" className="w-full">
                          {fr.actions.quickReorder}
                        </SecondaryButton>
                      </Link>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title={fr.empty.history}
              description="Vos commandes passées apparaîtront ici pour recommander plus vite."
            />
          )}
        </div>
      </Screen>
      <CustomerBottomNav
        items={[
          { href: "/app", label: fr.navCustomer.home },
          { href: "/menu", label: fr.navCustomer.menu },
          { href: "/rewards", label: fr.navCustomer.rewards },
          { href: "/account", label: fr.navCustomer.account },
        ]}
      />
    </>
  );
}
