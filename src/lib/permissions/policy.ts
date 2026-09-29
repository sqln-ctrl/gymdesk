import type { PermissionKey } from "@/lib/permissions/keys";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";

export type AuthorizationSubject = {
  permissionKeys: readonly PermissionKey[];
  branchIds: readonly string[];
  roleKeys: readonly string[];
};

export function hasPermission(
  user: Pick<AuthorizationSubject, "permissionKeys"> | null,
  permission: PermissionKey,
): boolean {
  return user?.permissionKeys.includes(permission) ?? false;
}

export function canAccessBranch(
  user: Pick<AuthorizationSubject, "branchIds" | "roleKeys"> | null,
  branchId: string,
): boolean {
  return (
    user?.roleKeys.includes(OWNER_ROLE_KEY) === true ||
    user?.branchIds.includes(branchId) === true
  );
}
