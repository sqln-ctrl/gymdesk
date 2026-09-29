import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the password that created a hash", async () => {
    const hash = await hashPassword("Str0ng!Password2026");

    await expect(verifyPassword("Str0ng!Password2026", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password and malformed hash", async () => {
    const hash = await hashPassword("Str0ng!Password2026");

    await expect(verifyPassword("not-the-password", hash)).resolves.toBe(false);
    await expect(verifyPassword("Str0ng!Password2026", "bad-hash")).resolves.toBe(false);
  });
});
