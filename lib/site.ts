export const SITE_URL = "https://www.thelinelist.com";
export const SITE_NAME = "The Line List";
export const SITE_EMAIL = "hello@thelinelist.com";
export const PARENT_ORG = "Fresh Industries";
export const LAST_CHECKED_LABEL = "22 Aug 2026";
export const LAST_REVIEWED = "2026-08-22";

export function absoluteUrl(path = "/"): string {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return normalized ? `${SITE_URL}/${normalized}` : SITE_URL;
}
