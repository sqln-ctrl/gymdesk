export function formatOperationalDate(
  value: Date,
  timezone: string,
  locale = "en-PK",
): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(value);
}

export function formatOperationalDateTime(
  value: Date,
  timezone: string,
  locale = "en-PK",
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(value);
}
