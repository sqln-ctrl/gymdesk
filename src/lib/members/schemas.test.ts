import { describe, expect, it } from "vitest";

import { memberInputSchema } from "./schemas";

const validMember = {
  primaryBranchId: "branch-a",
  firstName: "Amina",
  lastName: "Khan",
  phone: "",
  email: "AMINA@EXAMPLE.COM",
  dateOfBirth: "1995-02-14",
  emergencyContactName: "",
  emergencyContactPhone: "",
  address: "",
  assignedTrainerId: "",
  notes: "",
};

describe("member input validation", () => {
  it("normalizes optional fields and parses dates in UTC", () => {
    const parsed = memberInputSchema.parse(validMember);

    expect(parsed.email).toBe("amina@example.com");
    expect(parsed.phone).toBeUndefined();
    expect(parsed.dateOfBirth?.toISOString()).toBe("1995-02-14T00:00:00.000Z");
  });

  it("rejects invalid identity and contact inputs", () => {
    const parsed = memberInputSchema.safeParse({
      ...validMember,
      firstName: "",
      email: "not-an-email",
      dateOfBirth: "14/02/1995",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors).toMatchObject({
        firstName: expect.any(Array),
        email: expect.any(Array),
        dateOfBirth: expect.any(Array),
      });
    }
  });
});
