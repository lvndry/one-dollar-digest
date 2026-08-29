# Security

This project runs a small set of secret-gated endpoints. Treat all of the
secrets below as production credentials — never commit them, and rotate on
suspicion of exposure.

## Secret-gated endpoints

| Endpoint                    | Secret env var                    | What it does                                                                                                                            |
| --------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/trigger-digest`  | `CRON_SECRET` (bearer) + `GH_PAT` | Dispatches the daily-digest GitHub workflow. Admin-only. `GH_PAT` must be a **repo-scoped** personal access token with `actions:write`. |
| `POST /api/articles/ingest` | `INGEST_SECRET` (bearer)          | Inserts digest articles. Also enforces a 5 MiB `content-length` limit.                                                                  |
| `POST /api/revalidate`      | `INGEST_SECRET` (bearer)          | Purges the `articles` cache tag.                                                                                                        |
| `POST /api/stripe/webhook`  | `STRIPE_WEBHOOK_SECRET`           | Verified via `stripe.webhooks.constructEvent` (signature, not a shared bearer).                                                         |

> Note: `/api/trigger-digest` is intended to be called by an **external cron**
> (not a GitHub Actions `schedule:`). The workflow itself is `workflow_dispatch`
> only.

## Secrets that are NOT documented elsewhere

These are used by code but are missing from `CONTRIBUTING.md` — add them if you
maintain setup docs:

- `INGEST_SECRET` — shared bearer secret for the ingest + revalidate endpoints.
- `CRON_SECRET` — shared bearer secret protecting `/api/trigger-digest`.
- `GH_PAT` — GitHub PAT used by `/api/trigger-digest` to dispatch workflows.

## Storage & handling

- `.env.local` is git-ignored (`git check-ignore` confirms). Never commit it.
- API keys are stored **hashed** (SHA-256) with a unique index on the hash; the
  raw key is shown to the user exactly once and cannot be recovered.
- Stripe webhooks are authenticated by signature, not by a shared token.

## Rotation

1. Regenerate the secret in the relevant provider (Stripe / GitHub / your secret manager).
2. Update the value in the deployment environment (Vercel env vars) and the
   external cron configuration for `CRON_SECRET` / `INGEST_SECRET`.
3. For `GH_PAT`, revoke the old token in GitHub and issue a new repo-scoped one.

## Reporting a vulnerability

Email the maintainer directly rather than opening a public issue for anything
that could expose subscriber data, payment state, or the ingest/cron secrets.
