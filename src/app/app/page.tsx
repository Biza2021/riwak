import Link from "next/link";
import { redirect } from "next/navigation";

import { AutoRefresh } from "@/components/auto-refresh";
import { BrandLogo } from "@/components/brand-logo";
import { CustomerBottomNav } from "@/components/navigation";
import { InstallPrompt } from "@/components/install-prompt";
import {
  Badge,
  Card,
  Screen,
  SectionHeader,
  SecondaryButton,
  MetricCard,
} from "@/components/ui";
import { fr } from "@/content/fr";
import { getCustomerHomeData } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";
import {
  customerTypeLabel,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/presentation";
import { formatDateTime, formatTimeOnly } from "@/lib/format";

export const dynamic = "force-dynamic";

function bottomNav(active: string) {
  return (
    <CustomerBottomNav
      items={[
        { href: "/app", label: fr.navCustomer.home, active: active === "home" },
        { href: "/menu", label: fr.navCustomer.menu, active: active === "menu" },
        {
          href: "/rewards",
          label: fr.navCustomer.rewards,
          active: active === "rewards",
        },
        {
          href: "/account",
          label: fr.navCustomer.account,
          active: active === "account",
        },
      ]}
    />
  );
}

export default async function CustomerHomePage() {
  const session = await requireCustomerSession();
  const customerProfile = session.user.customerProfile;

  if (!customerProfile) {
    redirect("/login");
  }

  const data = await getCustomerHomeData(customerProfile.id);

  if (!data.customer) {
    redirect("/login");
  }

  const customer = data.customer;
  const loyaltyAccount = customer.loyaltyAccount ?? {
    currentStampCount: 0,
    lifetimeStampCount: 0,
    availableFreeDrinks: 0,
  };

  return (
    <>
      <Screen className="pb-36">
        <AutoRefresh intervalMs={20000} />
        <div className="space-y-5">
          <BrandLogo variant="navbar" priority className="w-[116px] sm:w-[126px]" />
          <SectionHeader
            title={fr.home.greeting(customer.fullName)}
            description={fr.tagline}
          />

          <Card className="space-y-4 p-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#8c6239]">
                {fr.home.orderCardTitle}
              </p>
              <p className="text-sm leading-6 text-[#6d5644]">
                {fr.home.orderCardBody}
              </p>
            </div>
            <Link href="/menu" className="block">
              <SecondaryButton type="button" className="w-full">
                {fr.actions.orderNow}
              </SecondaryButton>
            </Link>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              title={fr.home.loyaltyTitle}
              value={`${loyaltyAccount.currentStampCount}/5`}
              detail={`${loyaltyAccount.availableFreeDrinks} ${fr.rewards.freeDrinkLabel.toLowerCase()}`}
              tone="gold"
            />
            <MetricCard
              title={fr.home.pinCardTitle}
              value={customer.loyaltyPin}
              detail={customerTypeLabel(customer.customerType)}
              tone="blue"
            />
          </div>

          {customer.activeOrder ? (
            <Card className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#8c6239]">
                    {fr.home.activeOrderTitle}
                  </p>
                  <p className="mt-1 text-sm text-[#6d5644]">
                    {fr.home.activeOrderBody}
                  </p>
                </div>
                <Badge tone={orderStatusTone(customer.activeOrder.status)}>
                  {orderStatusLabel(customer.activeOrder.status)}
                </Badge>
              </div>
              <div className="space-y-2 rounded-2xl bg-[#fff6e8] p-4">
                <p className="font-semibold text-[#2d1b12]">
                  {customer.activeOrder.orderItems
                    .map((item) => `${item.menuItem.name} x${item.quantity}`)
                    .join(", ")}
                </p>
                <p className="text-sm text-[#6d5644]">
                  {formatTimeOnly(customer.activeOrder.pickupTime)} • {formatDateTime(customer.activeOrder.expiresAt)}
                </p>
                <p className="text-xs text-[#7d6655]">
                  {fr.staff.activeUnpaidLabel}
                </p>
              </div>
              <Link href={`/orders/${customer.activeOrder.id}`} className="block">
                <SecondaryButton type="button" className="w-full">
                  {fr.actions.viewOrder}
                </SecondaryButton>
              </Link>
            </Card>
          ) : null}

          {customer.availableReward ? (
            <Card className="space-y-4 p-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#8c6239]">
                  {fr.home.rewardTitle}
                </p>
                <p className="text-sm leading-6 text-[#6d5644]">
                  {fr.rewards.unlockedBody}
                </p>
              </div>
              <Link href={`/rewards/${customer.availableReward.id}`} className="block">
                <SecondaryButton type="button" className="w-full">
                  {fr.rewards.available}
                </SecondaryButton>
              </Link>
            </Card>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="space-y-3 p-5">
              <p className="text-sm font-semibold text-[#8c6239]">
                {fr.home.recentOrderTitle}
              </p>
              {customer.recentCompletedOrder ? (
                <>
                  <p className="font-semibold text-[#2d1b12]">
                    {customer.recentCompletedOrder.orderItems
                      .map((item) => `${item.menuItem.name} x${item.quantity}`)
                      .join(", ")}
                  </p>
                  <p className="text-sm text-[#6d5644]">
                    {formatDateTime(customer.recentCompletedOrder.placedAt)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#6d5644]">{fr.empty.history}</p>
              )}
            </Card>

            <Card className="space-y-3 p-5">
              <p className="text-sm font-semibold text-[#8c6239]">
                {fr.home.favoriteOrderTitle}
              </p>
              {customer.quickReorderSource ? (
                <>
                  <p className="font-semibold text-[#2d1b12]">
                    {customer.quickReorderSource.orderItems
                      .map((item) => `${item.menuItem.name} x${item.quantity}`)
                      .join(", ")}
                  </p>
                  <Link
                    href={`/order/review?repeatFrom=${customer.quickReorderSource.id}`}
                    className="block"
                  >
                    <SecondaryButton type="button" className="w-full">
                      {fr.actions.quickReorder}
                    </SecondaryButton>
                  </Link>
                </>
              ) : (
                <p className="text-sm text-[#6d5644]">{fr.empty.history}</p>
              )}
            </Card>
          </div>

          <InstallPrompt
            title={fr.install.title}
            body={fr.install.body}
            iosHint={fr.install.iosHint}
          />
        </div>
      </Screen>
      {bottomNav("home")}
    </>
  );
}
