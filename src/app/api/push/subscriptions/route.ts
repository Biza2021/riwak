import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  deletePushSubscription,
  upsertPushSubscription,
} from "@/lib/push-notifications";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  endpoint: z.string().trim().url(),
  keys: z.object({
    p256dh: z.string().trim().min(1),
    auth: z.string().trim().min(1),
  }),
  userAgent: z.string().trim().max(400).optional().nullable(),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().trim().url(),
});

export async function POST(request: NextRequest) {
  const session = await getCurrentSession({ touch: false });

  if (!session?.user.id) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const payload = subscriptionSchema.safeParse(body);

  if (!payload.success) {
    return Response.json({ error: "BAD_FORM" }, { status: 400 });
  }

  await upsertPushSubscription(session.user.id, payload.data);

  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

export async function DELETE(request: NextRequest) {
  const session = await getCurrentSession({ touch: false });

  if (!session?.user.id) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const payload = unsubscribeSchema.safeParse(body);

  if (!payload.success) {
    return Response.json({ error: "BAD_FORM" }, { status: 400 });
  }

  await deletePushSubscription(session.user.id, payload.data.endpoint);

  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
