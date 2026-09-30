import { describe, expect, it } from "vitest";

import { deriveMembershipStatus, membershipEndDate, renewalStartDate } from "./dates";

describe("membership date rules", () => {
  it("calculates inclusive durations from a UTC start date", () => {
    expect(membershipEndDate(new Date("2026-01-31T00:00:00.000Z"), 30, "DAYS").toISOString())
      .toBe("2026-03-01T00:00:00.000Z");
    expect(membershipEndDate(new Date("2026-01-31T00:00:00.000Z"), 1, "MONTHS").toISOString())
      .toBe("2026-02-27T00:00:00.000Z");
  });

  it("derives frozen, expired, cancelled, and pending status without relying on stored status", () => {
    const base = {
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-05-31T00:00:00.000Z"),
      cancelledAt: null,
      freezes: [{
        startDate: new Date("2026-05-10T00:00:00.000Z"),
        endDate: new Date("2026-05-12T00:00:00.000Z"),
        unfrozenAt: null,
      }],
    };

    expect(deriveMembershipStatus(base, new Date("2026-05-11T17:00:00.000Z"))).toBe("FROZEN");
    expect(deriveMembershipStatus(base, new Date("2026-06-01T00:00:00.000Z"))).toBe("EXPIRED");
    expect(deriveMembershipStatus({ ...base, cancelledAt: new Date("2026-05-05T00:00:00.000Z") }, new Date("2026-05-06T00:00:00.000Z"))).toBe("CANCELLED");
    expect(deriveMembershipStatus({ ...base, startDate: new Date("2026-06-01T00:00:00.000Z") }, new Date("2026-05-01T00:00:00.000Z"))).toBe("PENDING");
  });

  it("treats an unfrozen period as active immediately", () => {
    expect(deriveMembershipStatus({
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-05-31T00:00:00.000Z"),
      cancelledAt: null,
      freezes: [{
        startDate: new Date("2026-05-10T00:00:00.000Z"),
        endDate: new Date("2026-05-12T00:00:00.000Z"),
        unfrozenAt: new Date("2026-05-10T08:00:00.000Z"),
      }],
    }, new Date("2026-05-10T12:00:00.000Z"))).toBe("ACTIVE");
  });

  it("starts an active renewal after its current expiry and an expired renewal today", () => {
    expect(renewalStartDate(new Date("2026-06-30T00:00:00.000Z"), new Date("2026-06-15T12:00:00.000Z")).toISOString())
      .toBe("2026-07-01T00:00:00.000Z");
    expect(renewalStartDate(new Date("2026-05-31T00:00:00.000Z"), new Date("2026-06-15T12:00:00.000Z")).toISOString())
      .toBe("2026-06-15T00:00:00.000Z");
  });
});
