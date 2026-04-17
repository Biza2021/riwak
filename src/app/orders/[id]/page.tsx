import { redirect } from "next/navigation";

import { CustomerOrderLive } from "@/components/customer-order-live";
import { CustomerBottomNav } from "@/components/navigation";
import { fr } from "@/content/fr";
import { serializeCustomerOrder } from "@/lib/customer-order";
import { getOrderById } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";

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
      <CustomerOrderLive initialOrder={serializeCustomerOrder(order)} />
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
