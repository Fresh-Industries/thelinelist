import { DIRECTORY_PLANTS } from "./plants";
import type { Plant } from "./types";

const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LISTING_REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function calendarDateParts(isoDate: string): [year: number, month: number, day: number] {
  const match = ISO_CALENDAR_DATE.exec(isoDate);
  if (!match) throw new Error(`Invalid listing review date: ${isoDate}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid listing review date: ${isoDate}`);
  }
  return [year, month, day];
}

export function latestListingReviewDate(
  plants: readonly Pick<Plant, "lastVerified">[],
): string {
  if (plants.length === 0) throw new Error("Cannot derive a listing review date from an empty directory");

  let latest = "";
  for (const plant of plants) {
    calendarDateParts(plant.lastVerified);
    if (plant.lastVerified > latest) latest = plant.lastVerified;
  }
  return latest;
}

export function formatListingReviewDate(isoDate: string): string {
  const [year, month, day] = calendarDateParts(isoDate);
  return LISTING_REVIEW_DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day)));
}

export const LISTINGS_LAST_REVIEWED_DATE = latestListingReviewDate(DIRECTORY_PLANTS);
export const LISTINGS_LAST_REVIEWED_LABEL = formatListingReviewDate(LISTINGS_LAST_REVIEWED_DATE);
