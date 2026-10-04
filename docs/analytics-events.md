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
| Homepage product-plan CTA clicked | `cta_product_plan_click` |
| New product plan created successfully | `product_plan_created` |
| Manufacturer research result displayed | `sourcing_matches_viewed` |
| Introduction drafts prepared successfully | `sourcing_drafts_prepared` |

The existing search, claim, and navigation events remain available for operational measurement. The analytics layer is a no-op unless `NEXT_PUBLIC_ANALYTICS_PROVIDER` is set.

Event properties may describe the selected product, filter, route, or manufacturer slug. Do not send names, email addresses, formula text, or other form contents to analytics.

## Product-plan funnel

| Event | Allowed properties | Meaning and limits |
| --- | --- | --- |
| `cta_product_plan_click` | `source`: `home_hero` or `home_how_it_works` | A click to `/sourcing`; not a created plan. |
| `product_plan_created` | `entry`: `manual` or `agent` | Successful new creation; an idempotent replay must not count as another creation. |
| `sourcing_matches_viewed` | `candidate_count`: number; `outcome`: `candidates` or `no_results` | Research returned and the UI displayed the result. A candidate is not confirmed manufacturer capability. Repeat research can emit this again. |
| `sourcing_drafts_prepared` | `draft_count`: number | Draft preparation succeeded. It does not record approval, sending, a reply, or a successful manufacturer introduction. Repeat preparation can emit this again. |

These milestones contain only fixed labels and counts. Never add raw product ideas, answers, brand names, private notes, email addresses, workspace IDs, guest tokens, packet URLs, or recipient message contents.

No analytics provider, pixel, or marketing destination was configured by this change. Check event delivery in an approved provider before using numbers to judge campaigns. With the provider unset, development logs can verify calls but there is no collected conversion history.

Count eligible sessions or deduplicated users in an approved provider when comparing funnel rates; dividing raw repeated event totals does not produce a reliable person-level conversion rate. Browser events can be blocked or lost, and agent navigation can differ from the direct UI flow. Inspect manual and agent creation separately. Events do not currently establish completed product decisions, saved-plan return rate, unique shortlists, founder approval, actual delivery, replies, revenue, or product launches. Use consented research for those outcomes until measurement is deliberately implemented.
