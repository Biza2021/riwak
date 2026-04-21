import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  FieldLabel,
  Notice,
  Screen,
  SecondaryButton,
  SectionHeader,
  TextField,
} from "@/components/ui";
import { fr } from "@/content/fr";
import { customerLoginAction } from "@/lib/actions";
import { getErrorMessage } from "@/lib/messages";
import { getCurrentSession } from "@/lib/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentSession({ touch: false });
  if (session?.user.customerProfile) {
    redirect("/app");
  }

  if (session?.user.staffUser) {
    redirect("/staff/orders");
  }

  const params = (await searchParams) ?? {};
  const error = getErrorMessage(params.error);

  return (
    <Screen>
      <div className="space-y-5">
        <BrandLogo
          variant="primary"
          priority
          className="w-[110px] sm:w-[122px]"
        />
        <SectionHeader
          title={fr.auth.loginTitle}
          description={fr.auth.loginBody}
        />

        {error ? <Notice tone="red">{error}</Notice> : null}

        <Card className="space-y-4 p-5">
          <form action={customerLoginAction} className="space-y-4">
            <input type="hidden" name="redirectTo" value="/app" />
            <div>
              <FieldLabel>{fr.common.phoneNumber}</FieldLabel>
              <TextField
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                placeholder={fr.forms.phonePlaceholder}
                required
              />
            </div>
            <SubmitButton className="w-full">{fr.actions.login}</SubmitButton>
          </form>
        </Card>

        <div className="space-y-3">
          <p className="text-center text-sm text-[#6d5644]">
            {fr.auth.loginCreateHint}{" "}
            <Link href="/register" className="font-semibold text-[#8c6239]">
              {fr.actions.register}
            </Link>
          </p>
          <Link href="/">
            <SecondaryButton type="button" className="w-full">
              {fr.actions.back}
            </SecondaryButton>
          </Link>
        </div>
      </div>
    </Screen>
  );
}
