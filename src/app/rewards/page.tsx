import Link from "next/link";

import { CustomerStampRequestCard } from "@/components/customer-stamp-request-card";
import { CustomerBottomNav } from "@/components/navigation";
import { SubmitButton } from "@/components/submit-button";
import { Screen, Card, SectionHeader, Badge, MetricCard, EmptyState, SecondaryButton } from "@/components/ui";
import { fr } from "@/content/fr";
import { LOYALTY_STAMP_THRESHOLD } from "@/lib/domain";
import { getCustomerRewardsData } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";
import { redeemRewardAction } from "@/lib/actions";
import { formatDateTime, formatMemberId } from "@/lib/format";
import { customerTypeLabel, customerTypeTone } from "@/lib/presentation";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const session = await requireCustomerSession();
  const customer = await getCustomerRewardsData(session.user.customerProfile!.id);

  if (!customer) {
    return null;
  }

  const loyaltyAccount = customer.loyaltyAccount ?? {
    currentStampCount: 0,
    lifetimeStampCount: 0,
    availableFreeDrinks: 0,
  };
  const availableRewards = customer.rewards.filter((reward) => reward.status === "AVAILABLE");
  const pendingStampRequest = customer.stampRequests[0]
    ? {
        id: customer.stampRequests[0].id,
        createdAt: customer.stampRequests[0].createdAt.toISOString(),
      }
    : null;

  return (
    <>
      <Screen className="pb-36">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.rewards.title}
            title={fr.rewards.title}
            description={fr.rewards.subtitle}
          />

          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              title={fr.rewards.stampLabel}
              value={`${loyaltyAccount.currentStampCount}/${LOYALTY_STAMP_THRESHOLD}`}
              detail={fr.loyalty.progress(loyaltyAccount.currentStampCount, LOYALTY_STAMP_THRESHOLD)}
              tone="gold"
            />
            <MetricCard
              title={fr.rewards.freeDrinkLabel}
              value={loyaltyAccount.availableFreeDrinks}
              detail={fr.loyalty.availableRewards(loyaltyAccount.availableFreeDrinks)}
              tone="green"
            />
          </div>

          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#8c6239]">{customer.fullName}</p>
                <p className="mt-1 text-sm text-[#6d5644]">{customer.phoneNumber}</p>
              </div>
              <Badge tone={customerTypeTone(customer.customerType)}>
                {customerTypeLabel(customer.customerType)}
              </Badge>
            </div>
            <div className="rounded-2xl bg-[#fff6e8] p-4 text-sm leading-6 text-[#6d5644]">
              <p>{fr.rewards.subtitle}</p>
              <p className="mt-1">
                {fr.common.memberId}:{" "}
                <span className="font-semibold text-[#2d1b12]">
                  {formatMemberId(customer.memberId)}
                </span>
              </p>
            </div>
          </Card>

          <CustomerStampRequestCard initialPendingRequest={pendingStampRequest} />

          {availableRewards.length ? (
            <Card className="space-y-4 p-5">
              <p className="text-sm font-semibold text-[#8c6239]">
                {fr.rewards.available}
              </p>
              <div className="space-y-3">
                {availableRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="rounded-2xl border border-[#e7d4bc] bg-[#fff8ef] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#2d1b12]">
                          {fr.rewards.freeDrinkLabel}
                        </p>
                        <p className="text-sm text-[#6d5644]">
                          {formatDateTime(reward.createdAt)}
                        </p>
                      </div>
                      <Badge tone="green">{fr.rewards.available}</Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/rewards/${reward.id}`} className="flex-1">
                        <SecondaryButton type="button" className="w-full">
                          Ouvrir
                        </SecondaryButton>
                      </Link>
                      <form action={redeemRewardAction} className="flex-1">
                        <input type="hidden" name="rewardId" value={reward.id} />
                        <input
                          type="hidden"
                          name="returnTo"
                          value={`/rewards/${reward.id}`}
                        />
                        <SubmitButton className="w-full">
                          {fr.actions.redeem}
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState
              title={fr.empty.rewards}
              description="Continuez à commander pour débloquer une boisson offerte."
            />
          )}

          <Card className="space-y-4 p-5">
            <p className="text-sm font-semibold text-[#8c6239]">
              {fr.rewards.historyTitle}
            </p>
            {customer.loyaltyEvents.length ? (
              <div className="space-y-3">
                {customer.loyaltyEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl bg-[#f8f1e7] px-4 py-3 text-sm text-[#5f4634]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#2d1b12]">
                          {event.type === "EARNED"
                            ? fr.loyalty.earned
                            : event.type === "REDEEMED"
                              ? fr.loyalty.redeemed
                              : fr.loyalty.adjusted}
                        </p>
                        <p className="mt-1">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                      <Badge tone={event.type === "ADJUSTED" ? "blue" : "gold"}>
                        {event.stampDelta > 0 ? `+${event.stampDelta}` : `${event.stampDelta}`}
                      </Badge>
                    </div>
                    {event.notes ? <p className="mt-2 text-xs leading-5">{event.notes}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={fr.empty.history} />
            )}
          </Card>
        </div>
      </Screen>
      <CustomerBottomNav
        items={[
          { href: "/app", label: fr.navCustomer.home },
          { href: "/menu", label: fr.navCustomer.menu },
          { href: "/rewards", label: fr.navCustomer.rewards, active: true },
          { href: "/account", label: fr.navCustomer.account },
        ]}
      />
    </>
  );
}
