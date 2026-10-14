import { describe, expect, it } from "vitest";

import { parseReportDateRange, timezoneDateKey, timezoneHour, timezoneStartOfDay } from "./filters";

describe("report date filters", () => {
  it("parses an inclusive calendar range as an exclusive-end query range", () => {
    const range = parseReportDateRange({ start: "2026-10-01", end: "2026-10-14" });

    expect(range.start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-15T00:00:00.000Z");
  });

  it("falls back for invalid, reversed, or oversized ranges", () => {
    const now = new Date("2026-10-14T12:00:00.000Z");

    expect(parseReportDateRange({ start: "2026-02-30", end: "2026-10-14" }, now).startInput).toBe("2026-09-15");
    expect(parseReportDateRange({ start: "2026-10-14", end: "2026-10-01" }, now).endInput).toBe("2026-10-14");
    expect(parseReportDateRange({ start: "2025-01-01", end: "2026-10-14" }, now).startInput).toBe("2026-09-15");
  });

  it("uses the gym timezone when building daily report boundaries", () => {
    const start = timezoneStartOfDay(new Date("2026-10-14T00:00:00.000Z"), "Asia/Karachi");

    expect(start.toISOString()).toBe("2026-10-13T19:00:00.000Z");
    expect(timezoneDateKey(new Date("2026-10-13T20:00:00.000Z"), "Asia/Karachi")).toBe("2026-10-14");
    expect(timezoneHour(new Date("2026-10-13T20:00:00.000Z"), "Asia/Karachi")).toBe(1);
  });
});
