import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { Card, PrimaryButton, Screen, SectionHeader } from "@/components/ui";
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
    <Screen>
      <div className="space-y-6">
        <BrandLogo
          variant="primary"
          priority
          className="w-[118px] sm:w-[132px]"
        />
        <SectionHeader
          eyebrow={fr.landing.eyebrow}
          title={fr.landing.title}
          description={fr.landing.subtitle}
        />

        <Card className="space-y-5 p-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#8c6239]">
              {fr.landing.registerCardTitle}
            </p>
            <p className="text-sm leading-6 text-[#5f4634]">
              {fr.landing.registerCardBody}
            </p>
          </div>

          <Link href="/register" className="block">
            <PrimaryButton type="button" className="w-full">
              {fr.actions.register}
            </PrimaryButton>
          </Link>

          <div className="rounded-2xl bg-[#faf3e9] px-4 py-3">
            <p className="text-sm text-[#6d5644]">
              {fr.landing.returningCardTitle}{" "}
              <Link href="/login" className="font-semibold text-[#8c6239]">
                {fr.actions.login}
              </Link>
            </p>
            <p className="mt-1 text-xs leading-5 text-[#8f7562]">
              {fr.landing.returningInlineBody}
            </p>
          </div>
        </Card>

        <div className="pt-1 text-center">
          <p className="text-xs leading-5 text-[#7a6656]">
            {fr.landing.staffLinkBody}
          </p>
          <Link
            href="/staff/login"
            className="mt-1 inline-flex text-sm font-semibold text-[#8c6239]"
          >
            {fr.landing.staffCardTitle}
          </Link>
        </div>
      </div>
    </Screen>
  );
}
