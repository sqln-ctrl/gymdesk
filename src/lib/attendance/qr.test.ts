import { describe, expect, it } from "vitest";

import { memberIdFromQrPayload, memberQrPayload } from "./qr";

describe("member QR payload", () => {
  const memberId = "cmh2uvni40000qky03z3hohqe";

  it("uses an opaque member identifier in a stable payload", () => {
    expect(memberQrPayload(memberId)).toBe("gymflow:member:cmh2uvni40000qky03z3hohqe");
  });

  it("accepts a valid payload and rejects arbitrary scanner input", () => {
    expect(memberIdFromQrPayload(memberQrPayload(memberId))).toBe(memberId);
    expect(memberIdFromQrPayload("MBR-2026-1234")).toBeNull();
  });
});
