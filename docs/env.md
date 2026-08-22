# Environment checklist

The Line List keeps conversion forms provider-neutral. Set what you have. Hide what you do not.

Intro and claim forms always render. They store a lead and notify the owner when a store or email adapter is configured. If neither Blob nor email is set, leads persist only in function memory (preview/dev). Production should set at least one durable store and one notify adapter.

## Site

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | No | Defaults to `https://the-line-list.vercel.app`. Used when composing source URLs. |

## Leads store

| Variable | Required | Notes |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Recommended | Vercel Blob. JSON files at `leads/{intro\|claim}/{date}/{id}.json`. |

If Blob is missing and email is configured, the notification email is the archive.

## Notify (owner email)

| Variable | Required | Notes |
| --- | --- | --- |
| `EMAIL_PROVIDER` | No | `resend` or `postmark`. If empty, the first configured adapter wins. |
| `RESEND_API_KEY` | One of Resend/Postmark | Resend REST adapter. |
| `POSTMARK_SERVER_TOKEN` | One of Resend/Postmark | Postmark REST adapter. |
| `POSTMARK_MESSAGE_STREAM` | No | Defaults to `outbound`. |
| `NOTIFY_FROM_EMAIL` | Recommended | Verified from address. Defaults to `The Line List <hello@thelinelist.com>`. |
| `NOTIFY_TO_EMAIL` | Recommended | Owner inbox. Defaults to `hello@thelinelist.com`. |

## Rate limit

| Variable | Required | Notes |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Recommended on Vercel | Shared limiter across instances. |
| `UPSTASH_REDIS_REST_TOKEN` | With the URL | |

Without Upstash, a best-effort in-memory limiter still runs on the current instance.

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
