# Local, staging and production setup

No infrastructure is created automatically. The provider plan, region, costs and acceptable-use terms need owner approval. Keep environments isolated. Never use production credentials in a preview or in these tests.

## Local application

Install exact dependencies with Node 24.19.0 and `npm ci`. `npm run content:build`, then `npm run dev`, serves the public app at loopback port 3210. `.env.local` is read by Next; CLI scripts read exported environment variables or `.env` through dotenv where documented. Secret fields are intentionally empty in `.env.example`. Use randomly generated independent secrets of at least 32 bytes for CSRF, HMACs and internal jobs. Do not copy test fixtures into live configuration.

For full local provider integration, use an isolated Supabase local stack using its officially supported CLI/Docker setup and a mail catcher. The current workstation had no Docker/PostgreSQL server available; automated SQL tests use PGlite and do not pretend local Auth/Storage were deployed. The app requires verified HTTPS provider URLs and certificate-verified SQL connections. Do not weaken production TLS to make a local provider shortcut work; use authorized isolated HTTPS staging to exercise provider flows.

## Provider project

1. Owner approves a separate staging project and production project, region, plans, budgets, SMTP provider and CAPTCHA service. Enable MFA on provider/host/source control accounts.
2. Enter canonical HTTPS `APP_ORIGIN`. Browser writes accept exactly this origin. Configure the host's trusted client-IP behavior; this application only trusts Vercel's platform-overwritten `x-vercel-forwarded-for` when `VERCEL=1`. A different host needs a reviewed trusted-metadata adapter, not arbitrary X-Forwarded-For fallback.
3. Disable unused Supabase Data API exposure or exclude `bong` and its helper functions; explicitly test anonymous and authenticated REST, RPC, GraphQL and Storage access. SQL revokes are only one layer.
4. Apply `supabase/migrations/202609270001_bong.sql` and `content/generated/catalog.sql` with the migration identity, using `npm run db:migrate` once configured. Review the command before use. `bong_owner` is a non-login owner role. The runtime and maintenance logins require owner-created strong credentials, never committed passwords. SQL application connections must identify as exactly `bong_runtime` or `bong_maintenance` and verify TLS peer identity.
5. Create separate private community-media and account-export buckets. Deny anonymous/authenticated upload/list/read via provider policies. Supply the two exact bucket names; the browser never chooses a bucket/path. Separate secret access for storage and Auth-admin workers.
6. Configure Supabase email OTP templates to display a six-digit code, 10-minute expiration and provider resend throttles. Supply verified SMTP and test actual delivery to designated real staging inboxes. Enable Turnstile at the provider Auth layer as well as application report/upload challenges. Set only host-bound genuine production keys at launch. Auth tokens go to the provider once; upload/report tokens have their own action and Siteverify use.
7. Configure retention/job scheduling to call `POST /api/internal/maintenance` with a dedicated Bearer secret and no browser cookies/origin, or run the protected CLI. This is not a Vercel cron GET endpoint. Use an owner-approved scheduler capable of authenticated POST. Monitor actual completion and retries; run at least every five minutes to meet live-store cleanup deadlines.
8. Set operational alerts for errors, failed jobs, stale moderation, storage/egress/SQL capacity, Auth/SMTP failures, suspicious staff events and backup failures. Send an actual test alert to the owner-approved monitored destination.

## Staff and safe enablement

Staff members first create verified provider accounts through the server sign-in path. An owner runs `npm run staff:manage -- --action grant --userId <verified-uuid> --role admin --reason "<real audit reason>"` with separate owner DB and Auth-admin credentials. The command validates actual provider identity. Staff are blocked from moderation until approved TOTP enrollment and challenge succeeds. Configure at least two recovery-capable staff members where feasible; no first-user-is-admin behavior exists.

Initially keep `REGISTRATIONS_ENABLED=false`, `POSTING_ENABLED=false`, `UPLOADS_ENABLED=false`, `REVIEW_ALL_SUBMISSIONS=true`. Environment flags only allow the SQL feature settings to open; both layers must permit writes. Owner-controlled SQL `feature.configure` can initialize flags; ordinary moderation UI can tighten operational switches under fresh MFA. Review staffing and actual staging journeys before enabling any public feature.

Production deployment/DNS/enabling participation needs explicit owner authority. Before that, fill the real editorial/legal/contacts/rights gates, execute the provider/direct-access/cache/SMTP/restore drills, obtain independent security review, and run `release:check`. A preview must have access protection as well as noindex; robots alone is not access control.

## Secret rotation

Close posting/uploads if a credential may be compromised; revoke affected application/provider sessions and preserve limited audit evidence. Rotate runtime credentials separately from migration/owner credentials, then verify exact role and TLS checks. Rotate provider Storage/Auth keys and scheduler/CSRF/HMAC secrets in secret stores. Changing CSRF or HMAC secrets invalidates forms/rate identities; schedule intentionally and verify rates after rotation. Never print old/new values in console transcripts or documents. Remove owner/migration credentials from the request-serving runtime.
