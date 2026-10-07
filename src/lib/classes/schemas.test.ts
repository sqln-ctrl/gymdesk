import { describe, expect, it } from "vitest";

import { fitnessClassInputSchema } from "./schemas";

const classInput = {
  branchId: "cmh2uvni40000qky03z3hohqe",
  trainerId: "",
  name: "Morning mobility",
  description: "",
  room: "Studio A",
  defaultCapacity: "16",
  defaultDurationMinutes: "45",
  firstSessionAt: "2026-10-08T08:00",
  occurrences: "8",
  repeatEveryDays: "7",
};

describe("class schedule validation", () => {
  it("parses a bounded recurring schedule", () => {
    const parsed = fitnessClassInputSchema.parse(classInput);
    expect(parsed.trainerId).toBeUndefined();
    expect(parsed.firstSessionAt.toISOString()).toBe("2026-10-08T08:00:00.000Z");
    expect(parsed.occurrences).toBe(8);
  });

  it("rejects invalid capacity and recurrence values", () => {
    expect(fitnessClassInputSchema.safeParse({ ...classInput, defaultCapacity: "0", occurrences: "53" }).success).toBe(false);
  });
});
