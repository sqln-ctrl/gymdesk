import { describe, expect, it } from "vitest";

import { createStaffInputSchema } from "./schemas";

describe("staff validation", () => {
  const base = {
    name: "Amina Trainer",
    email: "amina@example.com",
    roleKey: "TRAINER",
    branchIds: ["cmh2uvni40000qky03z3hohqe"],
    password: "StrongPassword1!",
    passwordConfirmation: "StrongPassword1!",
  };

  it("accepts a staff record with a strong initial password", () => {
    expect(createStaffInputSchema.safeParse(base).success).toBe(true);
  });

  it("requires at least one branch and matching password confirmation", () => {
    const result = createStaffInputSchema.safeParse({ ...base, branchIds: [], passwordConfirmation: "different" });
    expect(result.success).toBe(false);
  });
});
