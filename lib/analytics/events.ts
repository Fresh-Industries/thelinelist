/**
 * Canonical Fresh analytics events (Phase 3, via Chief of Staff).
 *
 * Display name → snake_case (1:1):
 * 1. Manufacturer search → manufacturer_search
 * 2. Filter update → filter_update
 * 3. Manufacturer profile viewed → manufacturer_profile_viewed
 * 4. Introduction form opened → introduction_form_opened
 * 5. Introduction form submitted → introduction_form_submitted
 * 6. Newsletter signup → newsletter_signup
 * 7. Manufacturer claim started → manufacturer_claim_started
 * 8. Manufacturer claim submitted → manufacturer_claim_submitted
 *
 * Bonus (kept because it is useful and already specified):
 * - Find a Manufacturer CTA → cta_find_manufacturer_click
 * - Featured slot CTA → featured_slot_cta_click
 */
export const ANALYTICS_EVENTS = {
  manufacturer_search: "manufacturer_search",
  filter_update: "filter_update",
  manufacturer_profile_viewed: "manufacturer_profile_viewed",
  introduction_form_opened: "introduction_form_opened",
  introduction_form_submitted: "introduction_form_submitted",
  newsletter_signup: "newsletter_signup",
  manufacturer_claim_started: "manufacturer_claim_started",
  manufacturer_claim_submitted: "manufacturer_claim_submitted",
  cta_find_manufacturer_click: "cta_find_manufacturer_click",
  featured_slot_cta_click: "featured_slot_cta_click",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEvent, string> = {
  manufacturer_search: "Manufacturer search",
  filter_update: "Filter update",
  manufacturer_profile_viewed: "Manufacturer profile viewed",
  introduction_form_opened: "Introduction form opened",
  introduction_form_submitted: "Introduction form submitted",
  newsletter_signup: "Newsletter signup",
  manufacturer_claim_started: "Manufacturer claim started",
  manufacturer_claim_submitted: "Manufacturer claim submitted",
  cta_find_manufacturer_click: "Find a Manufacturer click",
  featured_slot_cta_click: "Featured slot CTA click",
};
