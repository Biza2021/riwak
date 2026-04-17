import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import {
  Screen,
  Card,
  SectionHeader,
  TextField,
  FieldLabel,
  FieldHint,
  SecondaryButton,
  Notice,
} from "@/components/ui";
import { fr } from "@/content/fr";
import { registerCustomerAction, customerLoginAction } from "@/lib/actions";
import { getErrorMessage } from "@/lib/messages";

export default async function RegisterPage({
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
          eyebrow={fr.auth.registerTitle}
          title={fr.auth.registerTitle}
          description={fr.auth.registerBody}
        />

        {error ? <Notice tone="red">{error}</Notice> : null}

        <Card className="space-y-4 p-5">
          <form action={registerCustomerAction} className="space-y-4">
            <input type="hidden" name="redirectTo" value="/app" />
            <div>
              <FieldLabel>{fr.common.fullName}</FieldLabel>
              <TextField
                name="fullName"
                autoComplete="name"
                placeholder={fr.forms.namePlaceholder}
                required
              />
            </div>
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
            <SubmitButton className="w-full">
              {fr.actions.register}
            </SubmitButton>
          </form>
        </Card>

        <Card id="connexion" className="space-y-4 p-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#8c6239]">
              {fr.auth.loginTitle}
            </p>
            <p className="text-sm leading-6 text-[#6d5644]">{fr.auth.loginBody}</p>
          </div>
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
            <SubmitButton className="w-full">
              {fr.actions.login}
            </SubmitButton>
          </form>
        </Card>

        <div className="flex flex-col gap-3">
          <Link href="/">
            <SecondaryButton type="button" className="w-full">
              {fr.actions.back}
            </SecondaryButton>
          </Link>
          <Link href="/staff/login" className="text-center text-sm font-semibold text-[#8c6239]">
            {fr.landing.staffCardTitle}
          </Link>
        </div>
      </div>
    </Screen>
  );
}
