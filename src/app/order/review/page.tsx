import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerBottomNav } from "@/components/navigation";
import { VoiceNoteField } from "@/components/voice-note-field";
import {
  Screen,
  Card,
  SectionHeader,
  TextField,
  TextAreaField,
  PrimaryButton,
  SecondaryButton,
  Badge,
  Notice,
  FieldLabel,
} from "@/components/ui";
import { fr } from "@/content/fr";
import { createOrderAction } from "@/lib/actions";
import { getMenuItemById, getOrderById } from "@/lib/queries";
import { requireCustomerSession } from "@/lib/session";
import { getErrorMessage } from "@/lib/messages";
import { formatCurrency } from "@/lib/format";
import { pickupLabel, orderStatusLabel } from "@/lib/presentation";
import {
  PICKUP_OPTIONS,
  SUGAR_OPTIONS,
  isValidSugarCount,
  type PickupOptionMinutes,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

export default async function OrderReviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCustomerSession();
  const params = (await searchParams) ?? {};
  const error = getErrorMessage(params.error);
  const repeatFrom = readParam(params, "repeatFrom");
  const explicitMenuItemId = readParam(params, "menuItemId");
  const parsedQuantity = Number.parseInt(readParam(params, "quantity") || "1", 10);
  const parsedPickupMinutes = Number.parseInt(readParam(params, "pickupMinutes") || "10", 10);
  const parsedSugarCount = Number.parseInt(readParam(params, "sugarCount") || "0", 10);
  const explicitQuantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 1;
  const explicitPickupMinutes = (Number.isFinite(parsedPickupMinutes) ? parsedPickupMinutes : 10) as PickupOptionMinutes;
  const explicitSugarCount =
    Number.isFinite(parsedSugarCount) && isValidSugarCount(parsedSugarCount)
      ? parsedSugarCount
      : 0;
  const explicitNotes = readParam(params, "notes");

  let menuItemId = explicitMenuItemId;
  let quantity = explicitQuantity;
  const pickupMinutes = explicitPickupMinutes;
  let sugarCount = explicitSugarCount;
  let notes = explicitNotes;

  if (!menuItemId && repeatFrom) {
    const repeatedOrder = await getOrderById(repeatFrom);
    const firstItem = repeatedOrder?.orderItems[0];
    if (firstItem) {
      menuItemId = firstItem.menuItemId;
      quantity = firstItem.quantity;
      sugarCount =
        repeatedOrder && isValidSugarCount(repeatedOrder.sugarCount)
          ? repeatedOrder.sugarCount
          : 0;
      notes = firstItem.notes ?? repeatedOrder?.notes ?? "";
    }
  }

  if (!menuItemId) {
    redirect("/menu");
  }

  const item = await getMenuItemById(menuItemId);
  if (!item || !item.isActive) {
    redirect("/menu");
  }

  const currentPath = `/order/review?${new URLSearchParams({
    menuItemId,
    quantity: String(quantity),
    pickupMinutes: String(pickupMinutes),
    sugarCount: String(sugarCount),
    notes,
    ...(repeatFrom ? { repeatFrom } : {}),
  }).toString()}`;

  return (
    <>
      <Screen className="pb-36">
        <div className="space-y-5">
          <SectionHeader
            eyebrow={fr.order.reviewTitle}
            title={fr.order.reviewTitle}
            description={fr.order.reviewBody}
          />

          {error ? <Notice tone="red">{error}</Notice> : null}

          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-[#2d1b12]">{item.name}</p>
                <p className="mt-1 text-sm text-[#6d5644]">{item.description}</p>
              </div>
              <Badge tone="gold">{formatCurrency(Number(item.price) * quantity)}</Badge>
            </div>

            <form action={createOrderAction} className="space-y-4">
              <input type="hidden" name="menuItemId" value={menuItemId} />
              <input type="hidden" name="returnTo" value={currentPath} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#533728]">
                    {fr.common.quantity}
                  </label>
                  <TextField
                    type="number"
                    name="quantity"
                    min={1}
                    max={9}
                    defaultValue={quantity}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#533728]">
                    {fr.common.pickupTime}
                  </label>
                  <select
                    name="pickupMinutes"
                    defaultValue={pickupMinutes}
                    className="min-h-12 w-full rounded-2xl border border-[#dcc6ad] bg-white px-4 text-sm text-[#2d1b12]"
                  >
                    {PICKUP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {pickupLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="space-y-3 rounded-[1.35rem] border border-[#e1cfb7] bg-[#fcf7ef] p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#533728]">
                      {fr.order.quickInstructionsTitle}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#7c6654]">
                      {fr.order.reviewBody}
                    </p>
                  </div>

                  <div>
                    <FieldLabel>{fr.common.sugar}</FieldLabel>
                    <div className="grid grid-cols-4 gap-2">
                      {SUGAR_OPTIONS.map((option) => (
                        <label key={option} className="cursor-pointer">
                          <input
                            type="radio"
                            name="sugarCount"
                            value={option}
                            defaultChecked={option === sugarCount}
                            className="peer sr-only"
                          />
                          <span className="flex min-h-12 items-center justify-center rounded-2xl border border-[#dcc6ad] bg-white text-base font-semibold text-[#533728] transition peer-checked:border-[#8c6239] peer-checked:bg-[#8c6239] peer-checked:text-white">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>{fr.order.writtenNoteLabel}</FieldLabel>
                    <TextAreaField
                      name="notes"
                      defaultValue={notes}
                      placeholder={fr.forms.notesPlaceholder}
                    />
                  </div>

                  <VoiceNoteField />
                </div>
              </div>

              <div className="rounded-2xl bg-[#fff6e8] p-4 text-sm leading-6 text-[#6d5644]">
                <p className="font-semibold text-[#2d1b12]">{fr.order.reviewBody}</p>
                <p className="mt-1">{fr.common.status}: {orderStatusLabel("RECEIVED")}</p>
                <p>{fr.common.pickupTime}: {pickupLabel(pickupMinutes)}</p>
                <p>{fr.common.sugar}: {sugarCount}</p>
              </div>

              <PrimaryButton type="submit" className="w-full">
                {fr.actions.confirm}
              </PrimaryButton>
            </form>
          </Card>

          <div className="flex gap-3">
            <Link href={`/menu/${item.slug}`} className="flex-1">
              <SecondaryButton type="button" className="w-full">
                {fr.actions.back}
              </SecondaryButton>
            </Link>
            <Link href="/menu" className="flex-1">
              <SecondaryButton type="button" className="w-full">
                {fr.navCustomer.menu}
              </SecondaryButton>
            </Link>
          </div>
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
