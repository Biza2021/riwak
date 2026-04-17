import Link from "next/link";
import { redirect } from "next/navigation";

import { StaffTopNav } from "@/components/navigation";
import { SubmitButton } from "@/components/submit-button";
import {
  Screen,
  Card,
  SectionHeader,
  Badge,
  SecondaryButton,
} from "@/components/ui";
import { fr } from "@/content/fr";
import { updateOrderStatusAction } from "@/lib/actions";
import { getOrderById } from "@/lib/queries";
import { requireStaffSession } from "@/lib/session";
import { getVoiceNotePlaybackUrl } from "@/lib/voice-note-storage";
import { formatDateTime, formatTimeOnly, formatCurrency } from "@/lib/format";
import {
  customerTypeLabel,
  customerTypeTone,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/presentation";

export const dynamic = "force-dynamic";

const statusButtons = [
  "RECEIVED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "CANCELLED",
] as const;

export default async function StaffOrderDetailPage({
  params,
}: {
  params?: Promise<{ id: string }>;
}) {
  await requireStaffSession();
  const resolvedParams = (await params) ?? { id: "" };
  const order = await getOrderById(resolvedParams.id);

  if (!order) {
    redirect("/staff/orders");
  }

  const voiceNotePlaybackUrl = order.voiceNoteStorageKey
    ? await getVoiceNotePlaybackUrl(order.voiceNoteStorageKey).catch(() => null)
    : null;

  return (
    <>
      <Screen className="pb-40">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.staff.detailTitle}
            title={fr.staff.detailTitle}
            description={order.customer.fullName}
          />

          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[#2d1b12]">
                  {order.orderItems
                    .map((item) => `${item.menuItem.name} x${item.quantity}`)
                    .join(", ")}
                </p>
                <p className="mt-1 text-sm text-[#6d5644]">
                  {order.customer.phoneNumber}
                </p>
              </div>
              <Badge tone={orderStatusTone(order.status)}>
                {orderStatusLabel(order.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                  Retrait
                </p>
                <p className="mt-2 text-sm font-semibold text-[#2d1b12]">
                  {formatTimeOnly(order.pickupTime)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8f1e7] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                  Total
                </p>
                <p className="mt-2 text-sm font-semibold text-[#2d1b12]">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone={customerTypeTone(order.customer.customerType)}>
                {customerTypeLabel(order.customer.customerType)}
              </Badge>
              <Badge tone="gold">
                {fr.common.sugar} {order.sugarCount}
              </Badge>
              {order.customer.loyaltyAccount ? (
                <Badge tone="gold">
                  {order.customer.loyaltyAccount.currentStampCount}/5
                </Badge>
              ) : null}
              <Badge tone={order.isPaidAtShop ? "green" : "red"}>
                {order.isPaidAtShop ? "Paiement au comptoir" : "Paiement manquant"}
              </Badge>
            </div>

            <div className="rounded-2xl bg-[#fff6e8] p-4 text-sm leading-6 text-[#6d5644]">
              <p>
                {fr.staff.activeUnpaidLabel}: {formatDateTime(order.expiresAt)}
              </p>
              <p className="mt-1">Créée le {formatDateTime(order.placedAt)}</p>
            </div>

            <div className="rounded-2xl border border-[#e1cfb7] bg-[#fcf7ef] p-4">
              <p className="text-sm font-semibold text-[#8c6239]">
                {fr.order.quickInstructionsTitle}
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                    {fr.common.sugar}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#2d1b12]">
                    {order.sugarCount}
                  </p>
                </div>

                {order.notes ? (
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                      {fr.order.writtenNoteLabel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#2d1b12]">
                      {order.notes}
                    </p>
                  </div>
                ) : null}
              </div>

              {order.voiceNoteStorageKey ? (
                <div className="mt-3 rounded-2xl bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6b4c]">
                      {fr.order.voiceNoteLabel}
                    </p>
                    {order.voiceNoteDurationSec ? (
                      <Badge tone="neutral">{order.voiceNoteDurationSec}s</Badge>
                    ) : null}
                  </div>
                  {voiceNotePlaybackUrl ? (
                    <audio
                      controls
                      preload="none"
                      src={voiceNotePlaybackUrl}
                      className="mt-3 w-full"
                    />
                  ) : (
                    <p className="mt-3 text-sm text-[#6d5644]">
                      {fr.order.voiceNotePlaybackUnavailable}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <p className="text-sm font-semibold text-[#8c6239]">Actions statut</p>
            <div className="grid grid-cols-2 gap-2">
              {statusButtons.map((status) => (
                <form key={status} action={updateOrderStatusAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="status" value={status} />
                  <input type="hidden" name="returnTo" value={`/staff/orders/${order.id}`} />
                  <SubmitButton className="w-full">
                    {orderStatusLabel(status)}
                  </SubmitButton>
                </form>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <p className="text-sm font-semibold text-[#8c6239]">{fr.menu.detailTitle}</p>
            {order.orderItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[#f8f1e7] px-4 py-3 text-sm leading-6 text-[#5f4634]"
              >
                <p className="font-semibold text-[#2d1b12]">
                  {item.menuItem.name} x{item.quantity}
                </p>
                <p className="mt-1">
                  {formatCurrency(item.unitPrice)} {fr.common.each}
                </p>
              </div>
            ))}
          </Card>

          <Link href="/staff/orders">
            <SecondaryButton type="button" className="w-full">
              {fr.actions.back}
            </SecondaryButton>
          </Link>
        </div>
      </Screen>
      <StaffTopNav
        items={[
          { href: "/staff/orders", label: fr.navStaff.orders, active: true },
          { href: "/staff/customers", label: fr.navStaff.customers },
          { href: "/staff/settings", label: fr.navStaff.settings },
        ]}
      />
    </>
  );
}
