# Newsletter setup (Beehiiv or Kit)

If these variables are missing, the signup block is hidden. There is no disabled field and no "list is not open yet" copy.

Fresh is adding credentials after this PR. Either provider works. The first complete set wins unless `NEWSLETTER_PROVIDER` is set.

## Shared

| Variable | Notes |
| --- | --- |
| `NEWSLETTER_PROVIDER` | Optional. `beehiiv` or `kit` (`convertkit` also accepted). |

## Beehiiv

1. Create a publication in Beehiiv.
2. Create an API key with subscription write access.
3. Copy the publication ID.

| Variable | Notes |
| --- | --- |
| `BEEHIIV_API_KEY` | Bearer token. |
| `BEEHIIV_PUBLICATION_ID` | Publication UUID. |

Adapter: `POST https://api.beehiiv.com/v2/publications/{id}/subscriptions`.

## Kit (ConvertKit)

1. Create a form in Kit for The Line List weekly.
2. Copy the form ID and an API secret.

| Variable | Notes |
| --- | --- |
| `KIT_FORM_ID` | Form ID. |
| `KIT_API_KEY` or `CONVERTKIT_API_SECRET` | API secret. |

Adapter: `POST https://api.convertkit.com/v3/forms/{id}/subscribe`.

## After credentials land

1. Set the variables on the Vercel project (Preview + Production).
2. Confirm the homepage `#newsletter` block appears.
3. Submit `you@company.com` once and check Beehiiv/Kit.
4. The header and footer Newsletter links appear only when the provider is configured.
