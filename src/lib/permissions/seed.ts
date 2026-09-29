import type { Prisma, PrismaClient } from "@prisma/client";

import { OWNER_ROLE_KEY, PERMISSION_KEYS, type PermissionKey, type RoleKey } from "@/lib/permissions/keys";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

type RoleSeed = {
  key: RoleKey;
  name: string;
  description: string;
  permissions: readonly PermissionKey[];
};

const permissionNames: Record<PermissionKey, string> = {
  "audit.read": "View audit logs",
  "branch.manage": "Manage branches",
  "gym.manage": "Manage gym profile",
  "member.archive": "Archive members",
  "member.create": "Create members",
  "member.read": "View members",
  "member.update": "Update members",
  "membership.override": "Override memberships",
  "membership.plan.manage": "Manage membership plans",
  "membership.sell": "Sell memberships",
  "payment.record": "Record payments",
  "payment.refund": "Refund payments",
  "invoice.read": "View invoices",
  "report.finance": "View financial reports",
  "report.read": "View operational reports",
  "settings.manage": "Manage settings",
  "staff.manage": "Manage staff",
  "attendance.checkin": "Check in members",
  "attendance.override": "Override attendance validation",
  "workout.manage": "Manage workout plans",
  "workout.read": "View workout plans",
};

const ROLE_SEEDS: readonly RoleSeed[] = [
  {
    key: OWNER_ROLE_KEY,
    name: "Owner",
    description: "Full access across all branches.",
    permissions: PERMISSION_KEYS,
  },
  {
    key: "BRANCH_ADMIN",
    name: "Branch administrator",
    description: "Manage branch operations and staff.",
    permissions: PERMISSION_KEYS.filter((permission) =>
      !["gym.manage", "branch.manage", "settings.manage", "audit.read"].includes(permission),
    ),
  },
  {
    key: "RECEPTIONIST",
    name: "Receptionist",
    description: "Run front-desk member, sales, payment, and check-in workflows.",
    permissions: [
      "member.create",
      "member.read",
      "member.update",
      "membership.sell",
      "attendance.checkin",
      "invoice.read",
      "payment.record",
    ],
  },
  {
    key: "TRAINER",
    name: "Trainer",
    description: "Manage assigned member workout plans.",
    permissions: ["member.read", "workout.read", "workout.manage"],
  },
];

export async function seedAuthorization(client: DatabaseClient): Promise<void> {
  for (const key of PERMISSION_KEYS) {
    await client.permission.upsert({
      where: { key },
      create: { key, name: permissionNames[key] },
      update: { name: permissionNames[key] },
    });
  }

  const permissions = await client.permission.findMany({
    where: { key: { in: [...PERMISSION_KEYS] } },
    select: { id: true, key: true },
  });
  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

  for (const roleSeed of ROLE_SEEDS) {
    const role = await client.role.upsert({
      where: { key: roleSeed.key },
      create: {
        key: roleSeed.key,
        name: roleSeed.name,
        description: roleSeed.description,
      },
      update: {
        name: roleSeed.name,
        description: roleSeed.description,
      },
    });

    await client.rolePermission.deleteMany({ where: { roleId: role.id } });
    await Promise.all(
      roleSeed.permissions.map(async (permissionKey) => {
        const permissionId = permissionIdByKey.get(permissionKey);

        if (!permissionId) {
          throw new Error(`Seeded permission ${permissionKey} is missing.`);
        }

        await client.rolePermission.create({
          data: { roleId: role.id, permissionId },
        });
      }),
    );
  }
}
