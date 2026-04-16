import Link from "next/link";

import { CustomerBottomNav } from "@/components/navigation";
import { Screen, Card, SectionHeader, Badge, SecondaryButton, Notice } from "@/components/ui";
import { fr } from "@/content/fr";
import { logoutAction } from "@/lib/actions";
import { requireCustomerSession } from "@/lib/session";
import { customerTypeLabel, customerTypeTone } from "@/lib/presentation";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireCustomerSession();
  const customer = session.user.customerProfile;

  if (!customer) {
    return null;
  }

  return (
    <>
      <Screen className="pb-36">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.account.title}
            title={fr.account.title}
            description={fr.account.subtitle}
          />

          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[#2d1b12]">{customer.fullName}</p>
                <p className="mt-1 text-sm text-[#6d5644]">{customer.phoneNumber}</p>
              </div>
              <Badge tone={customerTypeTone(customer.customerType)}>
                {customerTypeLabel(customer.customerType)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                  PIN
                </p>
                <p className="mt-2 text-xl font-semibold text-[#2d1b12]">
                  {customer.loyaltyPin}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                  {fr.home.trustCardTitle}
                </p>
                <p className="mt-2 text-xl font-semibold text-[#2d1b12]">
                  {customerTypeLabel(customer.customerType)}
                </p>
              </div>
            </div>

            {customer.trustReason ? (
              <Notice tone={customer.customerType === "LIMITED" ? "red" : "blue"}>
                {customer.trustReason}
              </Notice>
            ) : null}

            <p className="text-sm text-[#6d5644]">
              Compte créé le {formatDateTime(customer.createdAt)}
            </p>

            <form action={logoutAction}>
              <SecondaryButton type="submit" className="w-full">
                {fr.actions.logout}
              </SecondaryButton>
            </form>
          </Card>

          <Link href="/rewards" className="block text-center text-sm font-semibold text-[#8c6239]">
            {fr.navCustomer.rewards}
          </Link>
        </div>
      </Screen>
      <CustomerBottomNav
        items={[
          { href: "/app", label: fr.navCustomer.home },
          { href: "/menu", label: fr.navCustomer.menu },
          { href: "/rewards", label: fr.navCustomer.rewards },
          { href: "/account", label: fr.navCustomer.account, active: true },
        ]}
      />
    </>
  );
}
