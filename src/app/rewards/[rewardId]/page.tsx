import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerBottomNav } from "@/components/navigation";
import { Card, Screen, SectionHeader, Badge, PrimaryButton, SecondaryButton } from "@/components/ui";
import { fr } from "@/content/fr";
import { redeemRewardAction } from "@/lib/actions";
import { getRewardById } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RewardPage({
  params,
}: {
  params?: Promise<{ rewardId: string }>;
}) {
  const session = await requireCustomerSession();
  const resolvedParams = (await params) ?? { rewardId: "" };
  const reward = await getRewardById(resolvedParams.rewardId);

  if (!reward || reward.customerId !== session.user.customerProfile?.id) {
    redirect("/rewards");
  }

  const currentPath = `/rewards/${reward.id}`;

  return (
    <>
      <Screen className="pb-36">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.rewards.unlockedTitle}
            title={fr.rewards.unlockedTitle}
            description={fr.rewards.unlockedBody}
          />

          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-[#2d1b12]">
                  {fr.rewards.freeDrinkLabel}
                </p>
                <p className="mt-1 text-sm text-[#6d5644]">
                  {formatDateTime(reward.createdAt)}
                </p>
              </div>
              <Badge tone="green">{fr.rewards.available}</Badge>
            </div>

            {reward.sourceOrder ? (
              <div className="rounded-2xl bg-[#fff6e8] p-4 text-sm leading-6 text-[#6d5644]">
                <p className="font-semibold text-[#2d1b12]">Commande source</p>
                <p className="mt-1">
                  {reward.sourceOrder.orderItems
                    .map((item) => `${item.menuItem.name} x${item.quantity}`)
                    .join(", ")}
                </p>
              </div>
            ) : null}

            <form action={redeemRewardAction} className="space-y-3">
              <input type="hidden" name="rewardId" value={reward.id} />
              <input type="hidden" name="returnTo" value={currentPath} />
              <PrimaryButton type="submit" className="w-full">
                {fr.actions.redeem}
              </PrimaryButton>
            </form>

            <Link href="/rewards" className="block">
              <SecondaryButton type="button" className="w-full">
                {fr.actions.back}
              </SecondaryButton>
            </Link>
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
