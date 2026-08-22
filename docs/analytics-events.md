# Analytics events

Fresh Phase 3 names, 1:1 with `lib/analytics/events.ts`.

| Display name | snake_case |
| --- | --- |
| Manufacturer search | `manufacturer_search` |
| Filter update | `filter_update` |
| Manufacturer profile viewed | `manufacturer_profile_viewed` |
| Introduction form opened | `introduction_form_opened` |
| Introduction form submitted | `introduction_form_submitted` |
| Newsletter signup | `newsletter_signup` |
| Manufacturer claim started | `manufacturer_claim_started` |
| Manufacturer claim submitted | `manufacturer_claim_submitted` |

Bonus events:

| Display name | snake_case |
| --- | --- |
| Find a Manufacturer click | `cta_find_manufacturer_click` |
| Featured slot CTA click | `featured_slot_cta_click` |

The pluggable layer is a no-op unless `NEXT_PUBLIC_ANALYTICS_PROVIDER` is set.
