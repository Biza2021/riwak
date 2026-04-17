import { redirect } from "next/navigation";

import { requireStaffSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StaffLoyaltyPage() {
  await requireStaffSession();
  redirect("/staff/customers");
}
