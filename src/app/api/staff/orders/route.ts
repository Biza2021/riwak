import type { NextRequest } from "next/server";

import { getStaffQueueData } from "@/lib/queries";
import { getCurrentSession } from "@/lib/session";
import { serializeStaffQueueData } from "@/lib/staff-queue";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession({ touch: false });

  if (!session?.user.staffUser) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? "ALL";
  const showDemo = request.nextUrl.searchParams.get("showDemo") === "1";
  const data = await getStaffQueueData(status, { showDemo });

  return Response.json(serializeStaffQueueData(data), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
