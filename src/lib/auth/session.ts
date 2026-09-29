import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db/prisma";
import { PERMISSION_KEYS, type PermissionKey } from "@/lib/permissions/keys";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/auth/tokens";

const SESSION_COOKIE_NAME = "gymflow-session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  roleKeys: readonly string[];
  permissionKeys: readonly PermissionKey[];
  branchIds: readonly string[];
  gymIds: readonly string[];
};

function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEYS.includes(value as PermissionKey);
}

export async function createSessionForUser(userId: string): Promise<void> {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.userSession.create({
    data: {
      userId,
      tokenHash: hashOpaqueToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
    priority: "high",
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.userSession.deleteMany({
      where: { tokenHash: hashOpaqueToken(token) },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          branchAssignments: { select: { branchId: true, branch: { select: { gymId: true } } } },
          roles: {
            select: {
              role: {
                select: {
                  key: true,
                  permissions: { select: { permission: { select: { key: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    return null;
  }

  const permissionKeys = [...new Set(
    session.user.roles.flatMap((userRole) =>
      userRole.role.permissions.map((rolePermission) => rolePermission.permission.key),
    ),
  )].filter(isPermissionKey);

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    roleKeys: session.user.roles.map((userRole) => userRole.role.key),
    permissionKeys,
    branchIds: session.user.branchAssignments.map((assignment) => assignment.branchId),
    gymIds: [...new Set(session.user.branchAssignments.map((assignment) => assignment.branch.gymId))],
  };
});
