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
