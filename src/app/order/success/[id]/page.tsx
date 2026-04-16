import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerBottomNav } from "@/components/navigation";
import { Card, Screen, SectionHeader, Badge, PrimaryButton, SecondaryButton } from "@/components/ui";
import { fr } from "@/content/fr";
import { getOrderById } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";
import { formatDateTime, formatTimeOnly } from "@/lib/format";
import { orderStatusLabel, orderStatusTone } from "@/lib/presentation";

export const dynamic = "force-dynamic";

export default async function OrderSuccessPage({
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
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.order.successTitle}
            title={fr.order.successTitle}
            description={fr.order.successBody}
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
              <p>{fr.order.successBody}</p>
              <p className="mt-1">Commande #{order.id.slice(0, 8)}</p>
            </div>
            <Link href={`/orders/${order.id}`} className="block">
              <PrimaryButton type="button" className="w-full">
                {fr.actions.viewOrder}
              </PrimaryButton>
            </Link>
            <Link href="/menu" className="block">
              <SecondaryButton type="button" className="w-full">
                {fr.navCustomer.menu}
              </SecondaryButton>
            </Link>
          </Card>

          {order.rewards.length ? (
            <Card className="space-y-3 p-5">
              <p className="text-sm font-semibold text-[#8c6239]">
                {fr.rewards.unlockedTitle}
              </p>
              <p className="text-sm leading-6 text-[#6d5644]">{fr.rewards.unlockedBody}</p>
              <Link href={`/rewards/${order.rewards[0].id}`} className="block">
                <SecondaryButton type="button" className="w-full">
                  {fr.rewards.available}
                </SecondaryButton>
              </Link>
            </Card>
          ) : null}
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
