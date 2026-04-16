import Link from "next/link";
import { redirect } from "next/navigation";

import { InstallPrompt } from "@/components/install-prompt";
import { Screen, Card, SectionHeader, SecondaryButton } from "@/components/ui";
import { fr } from "@/content/fr";
import { getCurrentSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session?.user.customerProfile) {
    redirect("/app");
  }

  if (session?.user.staffUser) {
    redirect("/staff/orders");
  }

  return (
    <Screen className="justify-between">
      <div className="space-y-6">
        <SectionHeader
          eyebrow={fr.landing.eyebrow}
          title={fr.landing.title}
          description={fr.landing.subtitle}
        />

        <Card className="space-y-4 p-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#8c6239]">
              {fr.landing.registerCardTitle}
            </p>
            <p className="text-sm leading-6 text-[#5f4634]">
              {fr.landing.registerCardBody}
            </p>
          </div>
          <Link href="/register" className="block">
            <SecondaryButton type="button" className="w-full">
              {fr.actions.register}
            </SecondaryButton>
          </Link>
          <div className="rounded-2xl bg-[#faf3e9] px-4 py-3 text-sm text-[#6d5644]">
            {fr.landing.returningCardTitle}
            <div className="mt-1">
              <Link href="/register#connexion" className="font-semibold text-[#8c6239]">
                {fr.actions.login}
              </Link>
              {" • "}
              <Link href="/staff/login" className="font-semibold text-[#8c6239]">
                {fr.landing.staffCardTitle}
              </Link>
            </div>
          </div>
        </Card>

        <InstallPrompt
          title={fr.install.title}
          body={fr.install.body}
          iosHint={fr.install.iosHint}
        />
      </div>

      <div className="space-y-3 pt-4 text-center text-xs leading-5 text-[#7a6656]">
        <p>{fr.landing.staffCardBody}</p>
        <Link href="/staff/login" className="font-semibold text-[#8c6239]">
          {fr.landing.staffCardTitle}
        </Link>
      </div>
    </Screen>
  );
}
