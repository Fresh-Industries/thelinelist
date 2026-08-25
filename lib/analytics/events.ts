/** Privacy-aware interaction events. Never send form contents or contact details. */
export const ANALYTICS_EVENTS = {
  product_selected: "product_selected",
  wizard_started: "wizard_started",
  wizard_completed: "wizard_completed",
  manufacturer_search: "manufacturer_search",
  filter_applied: "filter_applied",
  manufacturer_profile_viewed: "manufacturer_profile_viewed",
  introduction_form_opened: "introduction_form_opened",
  introduction_requested: "introduction_requested",
  newsletter_signup_completed: "newsletter_signup_completed",
  manufacturer_claim_started: "manufacturer_claim_started",
  manufacturer_claim_submitted: "manufacturer_claim_submitted",
  cta_find_manufacturer_click: "cta_find_manufacturer_click",
  featured_slot_cta_click: "featured_slot_cta_click",
  guide_to_directory_click: "guide_to_directory_click",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEvent, string> = {
  product_selected: "Product selected",
  wizard_started: "Wizard started",
  wizard_completed: "Wizard completed",
  manufacturer_search: "Manufacturer search",
  filter_applied: "Filter applied",
  manufacturer_profile_viewed: "Manufacturer profile viewed",
  introduction_form_opened: "Contact-help form opened",
  introduction_requested: "Contact help requested",
  newsletter_signup_completed: "Newsletter signup completed",
  manufacturer_claim_started: "Manufacturer claim started",
  manufacturer_claim_submitted: "Manufacturer claim submitted",
  cta_find_manufacturer_click: "Find a Manufacturer click",
  featured_slot_cta_click: "Featured slot CTA click",
  guide_to_directory_click: "Guide to directory click",
};
