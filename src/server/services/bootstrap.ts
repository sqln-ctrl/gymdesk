import "server-only";

import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/service";
import { hashPassword } from "@/lib/auth/password";
import type { BootstrapInput } from "@/lib/auth/schemas";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { seedAuthorization } from "@/lib/permissions/seed";

export type BootstrapResult =
  | { ok: true; userId: string }
  | { ok: false; code: "ALREADY_BOOTSTRAPPED" | "ROLE_NOT_FOUND" };

export async function isBootstrapRequired(): Promise<boolean> {
  return (await prisma.user.count()) === 0;
}

export async function bootstrapGym(input: BootstrapInput): Promise<BootstrapResult> {
  return prisma.$transaction(async (transaction) => {
    if ((await transaction.user.count()) > 0) {
      return { ok: false, code: "ALREADY_BOOTSTRAPPED" };
    }

    await seedAuthorization(transaction);
    const ownerRole = await transaction.role.findUnique({
      where: { key: OWNER_ROLE_KEY },
      select: { id: true },
    });

    if (!ownerRole) {
      return { ok: false, code: "ROLE_NOT_FOUND" };
    }

    const gym = await transaction.gym.create({
      data: { name: input.gymName },
    });
    const branch = await transaction.branch.create({
      data: {
        gymId: gym.id,
        name: input.branchName,
        code: input.branchCode,
      },
    });
    const owner = await transaction.user.create({
      data: {
        email: input.email,
        name: input.ownerName,
        passwordHash: await hashPassword(input.password),
        roles: { create: { roleId: ownerRole.id } },
        branchAssignments: { create: { branchId: branch.id } },
        staffProfile: { create: {} },
      },
    });

    await writeAuditLog(transaction, {
      action: "SYSTEM_BOOTSTRAPPED",
      entityType: "Gym",
      entityId: gym.id,
      after: { gymName: gym.name, firstBranchId: branch.id, ownerUserId: owner.id },
    });

    return { ok: true, userId: owner.id };
  });
}
