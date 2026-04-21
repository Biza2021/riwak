import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  FieldHint,
  FieldLabel,
  Notice,
  Screen,
  SecondaryButton,
  SectionHeader,
  TextField,
} from "@/components/ui";
import { fr } from "@/content/fr";
import { redeemCustomerAccessLinkAction } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/messages";
import { getCurrentSession, hashToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CustomerAccessPage({
  params,
  searchParams,
}: {
  params?: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentSession({ touch: false });
  if (session?.user.customerProfile) {
    redirect("/app");
  }

  if (session?.user.staffUser) {
    redirect("/staff/orders");
  }

  const resolvedParams = (await params) ?? { token: "" };
  const resolvedSearchParams = (await searchParams) ?? {};
  const error = getErrorMessage(resolvedSearchParams.error);
  const now = new Date();

  const accessLink = resolvedParams.token
    ? await prisma.customerAccessLink.findFirst({
        where: {
          tokenHash: hashToken(resolvedParams.token),
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        select: {
          customer: {
            select: {
              fullName: true,
            },
          },
        },
      })
    : null;

  const linkInvalid = !accessLink;
  const customerName = accessLink?.customer.fullName ?? "";

  return (
    <Screen>
      <div className="space-y-5">
        <BrandLogo
          variant="primary"
          priority
          className="w-[110px] sm:w-[122px]"
        />
        <SectionHeader
          title={fr.access.title}
          description={linkInvalid ? fr.access.invalidBody : fr.access.body(customerName)}
        />

        {!linkInvalid && error ? <Notice tone="red">{error}</Notice> : null}

        {linkInvalid ? (
          <Card className="space-y-4 p-5">
            <Notice tone="red" title={fr.access.invalidTitle}>
              {fr.errors.ACCESS_LINK_INVALID}
            </Notice>
            <div className="space-y-2">
              <Link href="/login">
                <SecondaryButton type="button" className="w-full">
                  {fr.actions.login}
                </SecondaryButton>
              </Link>
              <Link href="/">
                <SecondaryButton type="button" className="w-full">
                  {fr.actions.back}
                </SecondaryButton>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="space-y-4 p-5">
            <Notice tone="blue">{fr.access.linkHint}</Notice>

            <form action={redeemCustomerAccessLinkAction} className="space-y-4">
              <input type="hidden" name="token" value={resolvedParams.token} />
              <div>
                <FieldLabel>{fr.common.phoneNumber}</FieldLabel>
                <TextField
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  placeholder={fr.forms.phonePlaceholder}
                  required
                />
                <FieldHint>{fr.access.phoneHint}</FieldHint>
              </div>
              <SubmitButton className="w-full">{fr.actions.continue}</SubmitButton>
            </form>

            <Link href="/">
              <SecondaryButton type="button" className="w-full">
                {fr.actions.back}
              </SecondaryButton>
            </Link>
          </Card>
        )}
      </div>
    </Screen>
  );
}
