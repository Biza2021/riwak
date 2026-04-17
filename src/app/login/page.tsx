import Link from "next/link";

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
import { customerLoginAction } from "@/lib/actions";
import { getErrorMessage } from "@/lib/messages";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = getErrorMessage(params.error);

  return (
    <Screen>
      <div className="space-y-5">
        <SectionHeader
          eyebrow={fr.auth.loginTitle}
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
            <div>
              <FieldLabel>{fr.common.loyaltyPin}</FieldLabel>
              <TextField
                name="loyaltyPin"
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder={fr.forms.pinPlaceholder}
                required
              />
              <FieldHint>{fr.auth.pinHelp}</FieldHint>
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
