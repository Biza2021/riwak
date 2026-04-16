import Link from "next/link";

import {
  Screen,
  Card,
  SectionHeader,
  TextField,
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  Notice,
} from "@/components/ui";
import { fr } from "@/content/fr";
import { staffLoginAction } from "@/lib/actions";
import { getErrorMessage } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = getErrorMessage(params.error);

  return (
    <Screen className="justify-center">
      <div className="space-y-5">
        <SectionHeader
          eyebrow={fr.staff.loginTitle}
          title={fr.staff.loginTitle}
          description={fr.auth.staffLoginBody}
        />

        {error ? <Notice tone="red">{error}</Notice> : null}

        <Card className="space-y-4 p-5">
          <form action={staffLoginAction} className="space-y-4">
            <input type="hidden" name="redirectTo" value="/staff/orders" />
            <div>
              <FieldLabel>{fr.common.email}</FieldLabel>
              <TextField
                name="email"
                type="email"
                autoComplete="email"
                placeholder={fr.forms.emailPlaceholder}
                required
              />
            </div>
            <div>
              <FieldLabel>{fr.common.password}</FieldLabel>
              <TextField
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder={fr.forms.passwordPlaceholder}
                required
              />
            </div>
            <PrimaryButton type="submit" className="w-full">
              {fr.actions.login}
            </PrimaryButton>
          </form>
        </Card>

        <Link href="/" className="block">
          <SecondaryButton type="button" className="w-full">
            {fr.actions.back}
          </SecondaryButton>
        </Link>
      </div>
    </Screen>
  );
}
