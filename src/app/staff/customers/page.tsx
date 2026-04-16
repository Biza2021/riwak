import Link from "next/link";

import { StaffTopNav } from "@/components/navigation";
import { Screen, Card, SectionHeader, Badge, EmptyState } from "@/components/ui";
import { fr } from "@/content/fr";
import { getStaffCustomersData } from "@/lib/queries";
import { requireStaffSession } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { customerTypeLabel, customerTypeTone } from "@/lib/presentation";

export const dynamic = "force-dynamic";

export default async function StaffCustomersPage() {
  await requireStaffSession();
  const customers = await getStaffCustomersData();

  return (
    <>
      <Screen className="pb-24">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.staff.customerTitle}
            title={fr.staff.customerTitle}
            description="Vue rapide du niveau client, de la fidélité et des derniers passages."
          />

          {customers.length ? (
            <div className="space-y-3">
              {customers.map((customer) => (
                <Link key={customer.id} href={`/staff/customers/${customer.id}`} className="block">
                  <Card className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#2d1b12]">{customer.fullName}</p>
                        <p className="mt-1 text-sm text-[#6d5644]">{customer.phoneNumber}</p>
                      </div>
                      <Badge tone={customerTypeTone(customer.customerType)}>
                        {customerTypeLabel(customer.customerType)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                          Tampons
                        </p>
                        <p className="mt-2 font-semibold text-[#2d1b12]">
                          {customer.loyaltyAccount?.currentStampCount ?? 0}/5
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                          Récompenses
                        </p>
                        <p className="mt-2 font-semibold text-[#2d1b12]">
                          {customer.loyaltyAccount?.availableFreeDrinks ?? 0}
                        </p>
                      </div>
                    </div>

                    {customer.orders[0] ? (
                      <p className="text-sm leading-6 text-[#6d5644]">
                        Dernière commande: {formatDateTime(customer.orders[0].placedAt)}
                      </p>
                    ) : (
                      <p className="text-sm leading-6 text-[#6d5644]">Pas encore de commande.</p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title={fr.empty.customers} />
          )}
        </div>
      </Screen>
      <StaffTopNav
        items={[
          { href: "/staff/orders", label: fr.navStaff.orders },
          { href: "/staff/customers", label: fr.navStaff.customers, active: true },
          { href: "/staff/loyalty", label: fr.navStaff.loyalty },
          { href: "/staff/settings", label: fr.navStaff.settings },
        ]}
      />
    </>
  );
}
