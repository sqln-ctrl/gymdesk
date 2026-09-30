import { describe, expect, it } from "vitest";

import { checkInInputSchema } from "./schemas";

describe("check-in validation", () => {
  const baseInput = {
    memberId: "cmh2uvni40000qky03z3hohqe",
    branchId: "cmh2uvni40001qky0na4ulb3q",
    method: "SEARCH",
  };

  it("accepts a valid scanner or search check-in and omits a blank override reason", () => {
    expect(checkInInputSchema.parse({ ...baseInput, overrideReason: "" })).toMatchObject({
      ...baseInput,
      overrideReason: undefined,
    });
  });

  it("rejects malformed member identity and a too-short override reason", () => {
    const result = checkInInputSchema.safeParse({ ...baseInput, memberId: "not-a-member", overrideReason: "no" });
    expect(result.success).toBe(false);
  });
});
