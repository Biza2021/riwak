import { StaffCustomersWorkspace } from "@/components/staff-customers-workspace";
import { StaffTopNav } from "@/components/navigation";
import { Screen } from "@/components/ui";
import { fr } from "@/content/fr";
import { getStaffCustomersData } from "@/lib/queries";
import { requireStaffSession } from "@/lib/session";
import { serializeStaffCustomers } from "@/lib/staff-customers";

export const dynamic = "force-dynamic";

export default async function StaffCustomersPage() {
  await requireStaffSession();
  const customers = serializeStaffCustomers(await getStaffCustomersData());

  return (
    <>
      <Screen className="pb-40">
        <StaffCustomersWorkspace initialCustomers={customers} />
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
