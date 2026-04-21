import { CustomerBottomNav } from "@/components/navigation";
import { PushNotificationPreferences } from "@/components/push-notification-preferences";
import { SubmitButton } from "@/components/submit-button";
import { Card, Screen, SectionHeader } from "@/components/ui";
import { fr } from "@/content/fr";
import { logoutAction } from "@/lib/actions";
import { formatDateTime, formatMemberId } from "@/lib/format";
import { getCustomerAccountData } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireCustomerSession();
  const customerProfile = session.user.customerProfile;

  if (!customerProfile) {
    return null;
  }

  const customer = await getCustomerAccountData(customerProfile.id);

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
            <div>
              <p className="text-lg font-semibold text-[#2d1b12]">{customer.fullName}</p>
              <p className="mt-1 text-sm text-[#6d5644]">{customer.phoneNumber}</p>
            </div>

            <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                {fr.common.memberId}
              </p>
              <p className="mt-2 text-xl font-semibold text-[#2d1b12]">
                {formatMemberId(customer.memberId)}
              </p>
            </div>

            <p className="text-sm text-[#6d5644]">
              Compte créé le {formatDateTime(customer.createdAt)}
            </p>

            <form action={logoutAction}>
              <SubmitButton variant="secondary" className="w-full">
                {fr.actions.logout}
              </SubmitButton>
            </form>
          </Card>

          <PushNotificationPreferences
            title={fr.notifications.customer.title}
            description={fr.notifications.customer.description}
            enabledDescription={fr.notifications.customer.enabled}
            vapidPublicKey={process.env.WEB_PUSH_PUBLIC_KEY ?? ""}
          />
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
