# Analytics events

Canonical interaction events live in `lib/analytics/events.ts`.

| Interaction | Event |
| --- | --- |
| Product selected | `product_selected` |
| Wizard started | `wizard_started` |
| Wizard completed | `wizard_completed` |
| Filter applied | `filter_applied` |
| Manufacturer profile viewed | `manufacturer_profile_viewed` |
| Introduction requested | `introduction_requested` |
| Newsletter signup completed | `newsletter_signup_completed` |
| Guide-to-directory CTA clicked | `guide_to_directory_click` |

The existing search, claim, and navigation events remain available for operational measurement. The analytics layer is a no-op unless `NEXT_PUBLIC_ANALYTICS_PROVIDER` is set.

Event properties may describe the selected product, filter, route, or manufacturer slug. Do not send names, email addresses, formula text, or other form contents to analytics.
