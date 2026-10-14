export type ReportDateRange = {
  start: Date;
  end: Date;
  startInput: string;
  endInput: string;
};

const MAX_REPORT_DAYS = 366;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function utcDateFromParts(year: number, month: number, day: number): Date | null {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year
    && value.getUTCMonth() === month - 1
    && value.getUTCDate() === day
    ? value
    : null;
}

export function parseDateInput(value: string | undefined): Date | null {
  if (!value || !ISO_DATE_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  return utcDateFromParts(year, month, day);
}

export function formatDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addUtcDays(value: Date, days: number): Date {
  const result = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function defaultReportDateRange(now = new Date()): ReportDateRange {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = addUtcDays(today, -29);
  const end = addUtcDays(today, 1);
  return {
    start,
    end,
    startInput: formatDateInput(start),
    endInput: formatDateInput(today),
  };
}

export function parseReportDateRange(
  input: { start?: string; end?: string },
  now = new Date(),
): ReportDateRange {
  const start = parseDateInput(input.start);
  const endInclusive = parseDateInput(input.end);

  if (!start || !endInclusive || endInclusive < start) {
    return defaultReportDateRange(now);
  }

  const end = addUtcDays(endInclusive, 1);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days > MAX_REPORT_DAYS) {
    return defaultReportDateRange(now);
  }

  return {
    start,
    end,
    startInput: formatDateInput(start),
    endInput: formatDateInput(endInclusive),
  };
}

function formatToParts(value: Date, timezone: string, options: Intl.DateTimeFormatOptions): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, ...options })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function timezoneOffsetMilliseconds(value: Date, timezone: string): number {
  const parts = formatToParts(value, timezone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - value.getTime();
}

/** Converts a UTC date-only marker into midnight on that calendar day in a gym timezone. */
export function timezoneStartOfDay(value: Date, timezone: string): Date {
  const utcMidnight = Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  let candidate = new Date(utcMidnight - timezoneOffsetMilliseconds(new Date(utcMidnight), timezone));
  const correctedOffset = timezoneOffsetMilliseconds(candidate, timezone);
  candidate = new Date(utcMidnight - correctedOffset);
  return candidate;
}

export function timezoneDateKey(value: Date, timezone: string): string {
  const parts = formatToParts(value, timezone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function timezoneHour(value: Date, timezone: string): number {
  const parts = formatToParts(value, timezone, { hour: "2-digit", hourCycle: "h23" });
  return Number(parts.hour);
}
