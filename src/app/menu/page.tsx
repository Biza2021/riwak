import Link from "next/link";

import { CustomerBottomNav } from "@/components/navigation";
import { Screen, Card, SectionHeader, Badge, EmptyState } from "@/components/ui";
import { fr } from "@/content/fr";
import { getMenuCatalog } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  await requireCustomerSession();
  const menuItems = await getMenuCatalog();

  return (
    <>
      <Screen className="pb-36">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.menu.title}
            title={fr.menu.title}
            description={fr.menu.subtitle}
          />

          {menuItems.length ? (
            <div className="space-y-3">
              {menuItems.map((item) => (
                <Link key={item.id} href={`/menu/${item.slug}`} className="block">
                  <Card className="space-y-3 p-5 transition active:scale-[0.99]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-[#2d1b12]">
                          {item.name}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[#6d5644]">
                          {item.description || fr.menu.detailBody}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-[#2d1b12]">
                          {formatCurrency(item.price)}
                        </p>
                        <p className="text-xs text-[#7d6655]">{item.slug}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="gold">{item.isQualifying ? fr.labels.qualifying : fr.labels.optional}</Badge>
                      {item.notesRequired ? (
                        <Badge tone="blue">{fr.labels.required}</Badge>
                      ) : null}
                      {!item.isActive ? <Badge tone="red">Masqué</Badge> : null}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title={fr.empty.menu}
              description="Les articles apparaîtront ici dès qu’ils seront configurés dans l’espace équipe."
            />
          )}
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
