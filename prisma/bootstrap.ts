import { Prisma, PrismaClient, type UserRole } from "@prisma/client";

import { hashSecret, normalizeStaffEmail } from "../src/lib/auth";

const prisma = new PrismaClient();

type BootstrapAccountConfig = {
  label: "admin" | "staff";
  role: UserRole;
  fullName: string;
  email: string;
  password: string;
};

function isUniqueConstraintError(error: unknown, field?: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  if (!field) {
    return true;
  }

  const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
  return targets.includes(field);
}

function readBootstrapAccount(params: {
  label: "admin" | "staff";
  role: UserRole;
  fullName: string;
  emailEnv: string;
  passwordEnv: string;
}) {
  const rawEmail = process.env[params.emailEnv]?.trim() ?? "";
  const rawPassword = process.env[params.passwordEnv] ?? "";

  if (!rawEmail && !rawPassword) {
    return null;
  }

  if (!rawEmail || !rawPassword) {
    throw new Error(
      `Set both ${params.emailEnv} and ${params.passwordEnv} together.`,
    );
  }

  const email = normalizeStaffEmail(rawEmail);

  if (!email.includes("@")) {
    throw new Error(`${params.emailEnv} must be a valid email address.`);
  }

  if (rawPassword.trim().length < 8) {
    throw new Error(`${params.passwordEnv} must be at least 8 characters.`);
  }

  return {
    label: params.label,
    role: params.role,
    fullName: params.fullName,
    email,
    password: rawPassword,
  } satisfies BootstrapAccountConfig;
}

async function ensureBootstrapAccount(config: BootstrapAccountConfig) {
  const existing = await prisma.staffUser.findUnique({
    where: {
      email: config.email,
    },
    select: {
      id: true,
      email: true,
      active: true,
      user: {
        select: {
          role: true,
        },
      },
    },
  });

  if (existing) {
    console.log(
      `[bootstrap] ${config.label} already exists for ${existing.email} (${existing.user.role}).`,
    );
    return "skipped" as const;
  }

  const passwordHash = await hashSecret(config.password);

  try {
    await prisma.user.create({
      data: {
        role: config.role,
        staffUser: {
          create: {
            fullName: config.fullName,
            email: config.email,
            passwordHash,
            active: true,
          },
        },
      },
    });

    console.log(`[bootstrap] Created ${config.label} account for ${config.email}.`);
    return "created" as const;
  } catch (error) {
    if (isUniqueConstraintError(error, "email")) {
      console.log(`[bootstrap] ${config.label} already exists for ${config.email}.`);
      return "skipped" as const;
    }

    throw error;
  }
}

async function main() {
  const admin = readBootstrapAccount({
    label: "admin",
    role: "ADMIN",
    fullName: "Admin Riwak",
    emailEnv: "BOOTSTRAP_ADMIN_EMAIL",
    passwordEnv: "BOOTSTRAP_ADMIN_PASSWORD",
  });

  const staff = readBootstrapAccount({
    label: "staff",
    role: "STAFF",
    fullName: "Équipe Riwak",
    emailEnv: "BOOTSTRAP_STAFF_EMAIL",
    passwordEnv: "BOOTSTRAP_STAFF_PASSWORD",
  });

  if (!admin && !staff) {
    throw new Error(
      "No bootstrap credentials provided. Set BOOTSTRAP_ADMIN_* and/or BOOTSTRAP_STAFF_* before running this script.",
    );
  }

  if (admin && staff && admin.email === staff.email) {
    throw new Error("Bootstrap admin and staff emails must be different.");
  }

  if (admin) {
    await ensureBootstrapAccount(admin);
  }

  if (staff) {
    await ensureBootstrapAccount(staff);
  }

  console.log("[bootstrap] Done.");
}

main()
  .catch((error) => {
    console.error("[bootstrap] Failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
