import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { sendCustomerRewardEarnedNotification } from "@/lib/push-notifications";
import { getCurrentSession } from "@/lib/session";
import { approveStampRequest } from "@/lib/stamp-requests";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/staff/stamp-requests/[id]/approve">,
) {
  const session = await getCurrentSession({ touch: false });

  if (!session?.user.staffUser?.active) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await approveStampRequest(id, session.user.staffUser.id);

  if (result.status === "NOT_FOUND") {
    return Response.json(
      { error: "NOT_FOUND", redirectUrl: "/staff/customers" },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }

  if (result.status === "ALREADY_HANDLED") {
    return Response.json(
      {
        error: "ALREADY_HANDLED",
        redirectUrl: result.customerId
          ? `/staff/customers/${result.customerId}`
          : "/staff/customers",
      },
      {
        status: 409,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }

  if (result.status !== "APPROVED") {
    return Response.json(
      { error: "UNKNOWN", redirectUrl: "/staff/customers" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }

  if (result.rewardsCreated > 0) {
    await sendCustomerRewardEarnedNotification({
      userId: result.customerUserId,
      sourceKey: `stamp-request:${result.requestId}`,
      rewardsCreated: result.rewardsCreated,
    }).catch(() => undefined);
  }

  revalidatePath("/staff/customers");
  revalidatePath(`/staff/customers/${result.customerId}`);
  revalidatePath("/rewards");
  revalidatePath("/app");
  revalidatePath("/account");

  return Response.json(
    {
      ok: true,
      redirectUrl: `/staff/customers/${result.customerId}`,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
