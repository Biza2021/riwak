import { redirect } from "next/navigation";

import { CustomerBottomNav } from "@/components/navigation";
import { OrderConfigurator } from "@/components/order-configurator";
import { Badge, Card, Screen, SectionHeader } from "@/components/ui";
import { fr } from "@/content/fr";
import { getMenuItemBySlug } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MenuItemPage({
  params,
}: {
  params?: Promise<{ slug: string }>;
}) {
  await requireCustomerSession();
  const resolvedParams = (await params) ?? { slug: "" };
  const item = await getMenuItemBySlug(resolvedParams.slug);

  if (!item || !item.isActive) {
    redirect("/menu");
  }

  return (
    <>
      <Screen className="pb-36">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.menu.detailTitle}
            title={item.name}
            description={item.description || fr.menu.detailBody}
          />

          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#8c6239]">
                  {formatCurrency(item.price)}
                </p>
                <p className="mt-1 text-sm text-[#6d5644]">
                  {fr.menu.detailBody}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Badge tone="gold">{fr.labels.qualifying}</Badge>
                {item.notesRequired ? <Badge tone="blue">{fr.labels.required}</Badge> : null}
              </div>
            </div>

            <OrderConfigurator menuItemId={item.id} menuItemSlug={item.slug} returnTo="/menu" />
          </Card>
        </div>
      </Screen>
      <CustomerBottomNav
        items={[
          { href: "/app", label: fr.navCustomer.home },
          { href: "/menu", label: fr.navCustomer.menu, active: true },
          { href: "/rewards", label: fr.navCustomer.rewards },
          { href: "/account", label: fr.navCustomer.account },
        ]}
      />
    </>
  );
}
