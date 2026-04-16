import { createHash, randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "./db";

const SESSION_COOKIE = "riwak_session";
const SESSION_TTL_DAYS = 60;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

export async function createSession(userId: string) {
  const token = randomUUID().replace(/-/g, "");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.authSession.deleteMany({
      where: {
        tokenHash: hashToken(token),
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const session = await prisma.authSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          customerProfile: {
            include: {
              loyaltyAccount: true,
            },
          },
          staffUser: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  await prisma.authSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return session;
}

export async function requireCustomerSession() {
  const session = await getCurrentSession();
  if (!session?.user.customerProfile) {
    redirect("/");
  }

  return session;
}

export async function requireStaffSession() {
  const session = await getCurrentSession();
  if (!session?.user.staffUser) {
    redirect("/staff/login");
  }

  return session;
}
