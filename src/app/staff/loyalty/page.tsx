import Link from "next/link";

import { StaffTopNav } from "@/components/navigation";
import { Screen, Card, SectionHeader, Badge, MetricCard, EmptyState } from "@/components/ui";
import { fr } from "@/content/fr";
import { getStaffLoyaltyOverview } from "@/lib/queries";
import { requireStaffSession } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StaffLoyaltyPage() {
  await requireStaffSession();
  const data = await getStaffLoyaltyOverview();

  const totalFreeDrinks = data.accounts.reduce(
    (sum, account) => sum + account.availableFreeDrinks,
    0,
  );

  return (
    <>
      <Screen className="pb-40">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.staff.loyaltyTitle}
            title={fr.staff.loyaltyTitle}
            description="Vue simple des comptes fidélité et des tampons."
          />

          <div className="grid grid-cols-2 gap-3">
            <MetricCard title="Comptes" value={data.accounts.length} tone="blue" />
            <MetricCard title={fr.rewards.freeDrinkLabel} value={totalFreeDrinks} tone="gold" />
          </div>

          <Card className="space-y-3 p-5">
            <p className="text-sm font-semibold text-[#8c6239]">Répartition événements</p>
            <div className="flex flex-wrap gap-2">
              {data.stats.map((item) => (
                <Badge key={item.type} tone={item.type === "ADJUSTED" ? "blue" : "gold"}>
                  {item.type}: {item._count}
                </Badge>
              ))}
            </div>
          </Card>

          {data.accounts.length ? (
            <div className="space-y-3">
              {data.accounts.map((account) => (
                <Link key={account.id} href={`/staff/customers/${account.customerId}`} className="block">
                  <Card className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#2d1b12]">{account.customer.fullName}</p>
                        <p className="mt-1 text-sm text-[#6d5644]">{account.customer.phoneNumber}</p>
                      </div>
                      <Badge tone="gold">{account.currentStampCount}/5</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                          Vie
                        </p>
                        <p className="mt-2 font-semibold text-[#2d1b12]">
                          {account.lifetimeStampCount}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                          Offertes
                        </p>
                        <p className="mt-2 font-semibold text-[#2d1b12]">
                          {account.availableFreeDrinks}
                        </p>
                      </div>
                    </div>
                    {account.customer.orders[0] ? (
                      <p className="text-sm text-[#6d5644]">
                        Dernière commande: {formatDateTime(account.customer.orders[0].placedAt)}
                      </p>
                    ) : null}
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title={fr.empty.rewards} />
          )}
        </div>
      </Screen>
      <StaffTopNav
        items={[
          { href: "/staff/orders", label: fr.navStaff.orders },
          { href: "/staff/customers", label: fr.navStaff.customers },
          { href: "/staff/loyalty", label: fr.navStaff.loyalty, active: true },
          { href: "/staff/settings", label: fr.navStaff.settings },
        ]}
      />
    </>
  );
}
