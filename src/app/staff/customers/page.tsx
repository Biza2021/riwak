import { StaffCustomersWorkspace } from "@/components/staff-customers-workspace";
import { StaffTopNav } from "@/components/navigation";
import { Screen } from "@/components/ui";
import { fr } from "@/content/fr";
import { getStaffCustomersData } from "@/lib/queries";
import { requireStaffSession } from "@/lib/session";
import {
  serializeStaffCustomers,
  serializeStaffStampRequests,
} from "@/lib/staff-customers";

export const dynamic = "force-dynamic";

export default async function StaffCustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{ stampRequest?: string | string[] }>;
}) {
  await requireStaffSession();
  const data = await getStaffCustomersData();
  const resolvedSearchParams = (await searchParams) ?? {};
  const highlightedStampRequestId = Array.isArray(resolvedSearchParams.stampRequest)
    ? resolvedSearchParams.stampRequest[0]
    : resolvedSearchParams.stampRequest;
  const customers = serializeStaffCustomers(data.customers);
  const pendingStampRequests = serializeStaffStampRequests(data.pendingStampRequests);

  return (
    <>
      <Screen className="pb-40">
        <StaffCustomersWorkspace
          initialCustomers={customers}
          initialPendingStampRequests={pendingStampRequests}
          highlightedStampRequestId={highlightedStampRequestId}
        />
      </Screen>
      <StaffTopNav
        items={[
          { href: "/staff/orders", label: fr.navStaff.orders },
          { href: "/staff/customers", label: fr.navStaff.customers, active: true },
          { href: "/staff/settings", label: fr.navStaff.settings },
        ]}
      />
    </>
  );
}
