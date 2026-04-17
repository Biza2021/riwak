import type { NextRequest } from "next/server";

import { serializeCustomerOrder } from "@/lib/customer-order";
import { getOrderById } from "@/lib/queries";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession({ touch: false });

  if (!session?.user.customerProfile) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (order.customerId !== session.user.customerProfile.id) {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return Response.json(serializeCustomerOrder(order), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
