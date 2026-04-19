import { CustomerBottomNav } from "@/components/navigation";
import { PushNotificationPreferences } from "@/components/push-notification-preferences";
import { SubmitButton } from "@/components/submit-button";
import { Screen, Card, SectionHeader, Badge, Notice } from "@/components/ui";
import { fr } from "@/content/fr";
import { logoutAction } from "@/lib/actions";
import { displayCustomerType } from "@/lib/domain";
import { formatDateTime, formatMemberId } from "@/lib/format";
import { getCustomerAccountData } from "@/lib/queries";
import { customerTypeLabel, customerTypeTone } from "@/lib/presentation";
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

  const customerType = displayCustomerType({
    customerType: customer.customerType,
    limitedUntil: customer.limitedUntil,
    trustedUntil: customer.trustedUntil,
  });

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
              <Badge tone={customerTypeTone(customerType)}>
                {customerTypeLabel(customerType)}
              </Badge>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                  {fr.common.memberId}
                </p>
                <p className="mt-2 text-xl font-semibold text-[#2d1b12]">
                  {formatMemberId(customer.memberId)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                  {fr.home.trustCardTitle}
                </p>
                <p className="mt-2 text-xl font-semibold text-[#2d1b12]">
                  {customerTypeLabel(customerType)}
                </p>
              </div>
            </div>

            <Notice tone="blue">{fr.account.memberIdBody}</Notice>

            {customer.trustReason ? (
              <Notice tone={customerType === "LIMITED" ? "red" : "blue"}>
                {customer.trustReason}
              </Notice>
            ) : null}

            <p className="text-sm text-[#6d5644]">
              Compte créé le {formatDateTime(customer.createdAt)}
            </p>

            <details className="rounded-2xl border border-[#e3d1ba] bg-[#fcf7ef] px-4 py-3 text-sm text-[#5f4634]">
              <summary className="cursor-pointer list-none font-semibold text-[#8c6239]">
                {fr.account.recoveryCodeSummary}
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8b6b4c]">
                  {fr.account.recoveryCodeTitle}
                </p>
                <p className="text-xl font-semibold text-[#2d1b12]">
                  {customer.loyaltyPin}
                </p>
                <p className="leading-6 text-[#6d5644]">
                  {fr.account.recoveryCodeBody}
                </p>
              </div>
            </details>

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
