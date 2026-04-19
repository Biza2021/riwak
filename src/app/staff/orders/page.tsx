import { StaffOrdersLive } from "@/components/staff-orders-live";
import { StaffTopNav } from "@/components/navigation";
import { Screen } from "@/components/ui";
import { fr } from "@/content/fr";
import { getStaffQueueData } from "@/lib/queries";
import { requireStaffSession } from "@/lib/session";
import { serializeStaffQueueData } from "@/lib/staff-queue";

export const dynamic = "force-dynamic";

export default async function StaffOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffSession();
  const params = (await searchParams) ?? {};
  const status = typeof params.status === "string" ? params.status : "ALL";
  const showDemo = params.showDemo === "1";
  const initialData = serializeStaffQueueData(
    await getStaffQueueData(status, { showDemo }),
  );

  return (
    <>
      <Screen className="pb-40">
        <StaffOrdersLive
          initialData={initialData}
          status={status}
          showDemo={showDemo}
          vapidPublicKey={process.env.WEB_PUSH_PUBLIC_KEY ?? ""}
        />
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
