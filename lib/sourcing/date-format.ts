const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatReviewedDate(value: string, timeZone?: string): string {
  const dateOnly = value.match(DATE_ONLY);
  const timestamp = dateOnly
    ? Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(dateOnly ? { timeZone: "UTC" } : timeZone ? { timeZone } : {}),
  }).format(timestamp);
}

export function normalizeTimeZone(value: string | null | undefined): string {
  if (!value || value.length > 100) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return value;
  } catch {
    return "UTC";
  }
}

export function formatExportDate(value: Date | string | number, timeZone?: string): string {
  const timestamp = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  if (Number.isNaN(timestamp)) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: normalizeTimeZone(timeZone),
  }).format(timestamp);
}
