# Environment checklist

The Line List keeps conversion forms provider-neutral. Set what you have. Hide what you do not.

Intro and claim forms always render. They store a lead and notify the owner when a store or email adapter is configured. If neither Blob nor email is set, leads persist only in function memory (preview/dev). Production should set at least one durable store and one notify adapter.

## Site

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | No | Defaults to `https://www.thelinelist.com`. Used when composing source URLs. |

## Leads store

| Variable | Required | Notes |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Recommended | Vercel Blob. Lead JSON files use `leads/{intro\|claim}/{date}/{id}.json`; sourcing workspaces use private objects under `sourcing/`. |

If Blob is missing and email is configured, the notification email is the archive.

## Notify (owner email)

| Variable | Required | Notes |
| --- | --- | --- |
| `EMAIL_PROVIDER` | No | `resend` or `postmark`. If empty, the first configured adapter wins. |
| `RESEND_API_KEY` | One of Resend/Postmark | Resend REST adapter. |
| `POSTMARK_SERVER_TOKEN` | One of Resend/Postmark | Postmark REST adapter. |
| `POSTMARK_MESSAGE_STREAM` | No | Defaults to `outbound`. |
| `NOTIFY_FROM_EMAIL` | Recommended | Verified from address. Defaults to `The Line List <notifications@mail.thelinelist.com>` for Resend and `The Line List <hello@thelinelist.com>` for Postmark. |
| `NOTIFY_TO_EMAIL` | Recommended | Owner inbox. Defaults to `hello@thelinelist.com`. |

## Rate limit

| Variable | Required | Notes |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Recommended on Vercel | Shared limiter across instances. |
| `UPSTASH_REDIS_REST_TOKEN` | With the URL | |

Without Upstash, a best-effort in-memory limiter still runs on the current instance.

## Sourcing workspace store

The `/sourcing` product-plan workflow requires a durable store in production. It prefers Upstash when both Redis variables above are set, then falls back to private Vercel Blob. Development uses local temporary JSON files.

| Variable | Required | Notes |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | One durable-store option | Used with `UPSTASH_REDIS_REST_TOKEN` for workspace records and atomic send claims. |
| `UPSTASH_REDIS_REST_TOKEN` | With the URL | |
| `BLOB_READ_WRITE_TOKEN` | Alternative durable-store option | Reuses the Vercel Blob token from Leads store. |
| `BLOB_STORE_ID` | OIDC alternative | Use with `VERCEL_OIDC_TOKEN` when no Blob read/write token is set. |
| `VERCEL_OIDC_TOKEN` | With `BLOB_STORE_ID` | Vercel-provided OIDC credential for private Blob access. |

Without either durable backend, production returns `503` when a founder tries to create a workspace. It does not create a workspace link that may disappear between server instances.

## Newsletter

See `docs/env-newsletter.md`. If the newsletter provider env is missing, the signup UI is hidden.

## Analytics

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | No | `plausible`, `posthog`, or `console`. Unset is a no-op (logs in development). |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | For Plausible | Example: `thelinelist.com`. |
| `NEXT_PUBLIC_POSTHOG_KEY` | For PostHog | Project key. |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | Defaults to `https://us.i.posthog.com`. |

Canonical event names are documented in the pull request. The code uses the snake_case keys in `lib/analytics/events.ts`.
