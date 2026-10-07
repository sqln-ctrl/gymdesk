import { describe, expect, it } from "vitest";

import { progressEntryInputSchema } from "./schemas";

const validProgressEntry = {
  recordedAt: "2026-10-07",
  weightKg: "72.4",
  bodyFatPercent: "18.5",
  chestCm: "",
  waistCm: "81",
  hipsCm: "",
  armsCm: "",
  thighsCm: "",
  notes: "  Strength improving.  ",
};

describe("progress entry validation", () => {
  it("parses optional measurements and stores the entry date in UTC", () => {
    const parsed = progressEntryInputSchema.parse(validProgressEntry);

    expect(parsed.recordedAt.toISOString()).toBe("2026-10-07T00:00:00.000Z");
    expect(parsed.weightKg).toBe(72.4);
    expect(parsed.waistCm).toBe(81);
    expect(parsed.chestCm).toBeUndefined();
    expect(parsed.notes).toBe("Strength improving.");
  });

  it("requires at least one numeric measurement", () => {
    const result = progressEntryInputSchema.safeParse({
      ...validProgressEntry,
      weightKg: "",
      bodyFatPercent: "",
      waistCm: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.weightKg).toContain("Enter at least one measurement.");
    }
  });

  it("does not coerce missing form fields to zero", () => {
    const result = progressEntryInputSchema.safeParse({
      recordedAt: "2026-10-07",
      weightKg: null,
      bodyFatPercent: null,
      chestCm: null,
      waistCm: null,
      hipsCm: null,
      armsCm: null,
      thighsCm: null,
      notes: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects impossible dates and out-of-range values", () => {
    const result = progressEntryInputSchema.safeParse({
      ...validProgressEntry,
      recordedAt: "2026-02-30",
      weightKg: "0",
      bodyFatPercent: "101",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        recordedAt: expect.any(Array),
        weightKg: expect.any(Array),
        bodyFatPercent: expect.any(Array),
      });
    }
  });
});
