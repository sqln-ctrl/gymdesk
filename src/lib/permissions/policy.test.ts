import { describe, expect, it } from "vitest";

import { canAccessBranch, hasPermission } from "./policy";

describe("authorization policy", () => {
  it("blocks an unauthenticated caller", () => {
    expect(hasPermission(null, "member.read")).toBe(false);
    expect(canAccessBranch(null, "branch-a")).toBe(false);
  });

  it("grants only explicitly assigned permissions", () => {
    const receptionist = {
      permissionKeys: ["member.read", "attendance.checkin"] as const,
      branchIds: ["branch-a"],
      roleKeys: ["RECEPTIONIST"],
    };

    expect(hasPermission(receptionist, "attendance.checkin")).toBe(true);
    expect(hasPermission(receptionist, "payment.refund")).toBe(false);
    expect(hasPermission(receptionist, "member.archive")).toBe(false);
  });

  it("enforces branch scope except for owners", () => {
    const branchAdmin = {
      permissionKeys: ["member.read"] as const,
      branchIds: ["branch-a"],
      roleKeys: ["BRANCH_ADMIN"],
    };
    const owner = {
      permissionKeys: ["member.read"] as const,
      branchIds: ["branch-a"],
      roleKeys: ["OWNER"],
    };

    expect(canAccessBranch(branchAdmin, "branch-a")).toBe(true);
    expect(canAccessBranch(branchAdmin, "branch-b")).toBe(false);
    expect(canAccessBranch(owner, "branch-b")).toBe(true);
  });
});
