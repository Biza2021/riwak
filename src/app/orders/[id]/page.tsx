import Link from "next/link";
import { redirect } from "next/navigation";

import { AutoRefresh } from "@/components/auto-refresh";
import { CustomerBottomNav } from "@/components/navigation";
import { OrderTimeline } from "@/components/order-timeline";
import { Card, Screen, SectionHeader, Badge, SecondaryButton } from "@/components/ui";
import { fr } from "@/content/fr";
import { getOrderById } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";
import { formatDateTime, formatTimeOnly } from "@/lib/format";
import { orderStatusLabel, orderStatusTone } from "@/lib/presentation";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({
  params,
}: {
  params?: Promise<{ id: string }>;
}) {
  const session = await requireCustomerSession();
  const resolvedParams = (await params) ?? { id: "" };
  const order = await getOrderById(resolvedParams.id);

  if (!order || order.customerId !== session.user.customerProfile?.id) {
    redirect("/app");
  }

  return (
    <>
      <Screen className="pb-36">
        <AutoRefresh intervalMs={10000} />
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
                  {order.orderItems.map((item) => `${item.menuItem.name} x${item.quantity}`).join(", ")}
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
              <p className="mt-1">
                Paiement: au comptoir
              </p>
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
