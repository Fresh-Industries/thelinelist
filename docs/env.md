# Environment checklist

The production app uses PostgreSQL for structured application state and Better Auth sessions. Vercel Blob is limited to binary product artwork.

## Site

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical public origin. Defaults to `https://www.thelinelist.com` in site helpers. |

## PostgreSQL and authentication

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Production | PostgreSQL connection used by Prisma for Better Auth, product workspaces, packet metadata, activity, asset metadata, and lead submissions. |
| `BETTER_AUTH_URL` | Production | Canonical auth origin, for example `https://www.thelinelist.com`. |
| `BETTER_AUTH_SECRET` | Production | At least 32 characters of high-entropy secret material. Generate with `openssl rand -base64 32`. |

Production fails closed when PostgreSQL or auth configuration is missing. Guest workspaces use PostgreSQL too; they are owned by a hashed, expiring credential stored in a secure HttpOnly cookie. Development may use temporary local workspace JSON only to support visual work when a local PostgreSQL service is not configured. That adapter is never selected in production.

Prisma commands must use a non-production connection:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate dev --name <descriptive-name>
```

Never point local migration or test commands at the production database.

Vercel runs `prisma generate`, then `next build`. Production also applies committed migrations with `prisma migrate deploy` against that environment's `DATABASE_URL`. Preview and local Vercel builds skip migrations so they cannot touch the production database. Configure a separate Preview database before enabling preview migrations.

## Binary artwork storage

| Variable | Required | Notes |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Recommended | Private Vercel Blob storage for uploaded PNG, JPG, or WebP artwork bytes only. |
| `BLOB_STORE_ID` | Optional OIDC path | Connected Vercel Blob store ID. |
| `VERCEL_OIDC_TOKEN` | Optional local OIDC path | Explicit local OIDC credential for the connected Blob store. |

Workspace JSON, packets, send locks, and lead JSON do not belong in Blob. Artwork ownership and safe file metadata live in PostgreSQL; Blob stores only the bytes. In development, artwork can use the operating-system temporary directory.

## Owner notifications

| Variable | Required | Notes |
| --- | --- | --- |
| `EMAIL_PROVIDER` | No | `resend` or `postmark`. If empty, the first configured adapter wins. |
| `RESEND_API_KEY` | One of Resend/Postmark | Resend REST adapter. |
| `POSTMARK_SERVER_TOKEN` | One of Resend/Postmark | Postmark REST adapter. |
| `POSTMARK_MESSAGE_STREAM` | No | Defaults to `outbound`. |
| `NOTIFY_FROM_EMAIL` | Recommended | Verified from address. |
| `NOTIFY_TO_EMAIL` | Recommended | Owner review inbox. |

Lead submissions fail closed unless they can be stored as PostgreSQL rows. Email is a notification channel, not the system of record. The row is created before notification is attempted; a notification failure is recorded on the stored submission and does not turn that successful submission into a form error. There is no email-only or process-memory success path for claim, correction, featured-interest, or introduction leads.

## Rate limiting

| Variable | Required | Notes |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Recommended on Vercel | Shared rate limiter across instances. It is not a product-workspace store. |
| `UPSTASH_REDIS_REST_TOKEN` | With the URL | |

Without Upstash, a best-effort in-memory limiter still runs on the current instance.

## Newsletter and analytics

See `docs/env-newsletter.md` for newsletter configuration. Analytics variables remain `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_POSTHOG_KEY`, and `NEXT_PUBLIC_POSTHOG_HOST`.
