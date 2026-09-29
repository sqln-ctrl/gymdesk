import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/permissions/keys";
import { canAccessBranch, hasPermission } from "@/lib/permissions/policy";

export { canAccessBranch, hasPermission } from "@/lib/permissions/policy";

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getAuthorizedUser(
  permission: PermissionKey,
  branchId?: string,
): Promise<CurrentUser | null> {
  const user = await getCurrentUser();

  if (!hasPermission(user, permission)) {
    return null;
  }

  if (branchId && !canAccessBranch(user, branchId)) {
    return null;
  }

  return user;
}
