import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/session";

export default async function StaffIndexPage() {
  const session = await getCurrentSession();

  if (session?.user.staffUser) {
    redirect("/staff/orders");
  }

  redirect("/staff/login");
}
