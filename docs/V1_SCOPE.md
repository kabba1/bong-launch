# Public v1 scope

The owner explicitly scoped v1 to the public generator, idea links, sourced timeline, About/lore, $BONG information and Community Coming Soon. Accounts, email codes, onboarding, posts/comments/reports, profiles, moderation, uploads, export/deletion and private maintenance are deferred to retained, disabled community v2 code.

The master switch is `COMMUNITY_ENABLED=true` only for an explicitly configured and independently gated community environment. Unset/false means disabled. V1 requires it disabled even if private credentials or stale browser cookies exist. Private route/API denial must happen before Auth, SQL, storage, CAPTCHA or session work. Community CLI commands must also refuse the disabled scope. No backend outage message, fake activity, disabled sign-in form or pretend submission substitutes for a clear Coming Soon page.

Public routes use checked local content and supplied assets. They must work with no private-service configuration and make no Auth/email/CAPTCHA/SQL/upload/AI/wallet requests. Configured real social links may render; absent links must not become invented accounts or `#` placeholders. Token mode remains deliberately `not_launched` unless exact owner-verified live identifiers and disclosures are supplied.

On 2026-10-01 the owner removed the public v1 per-event approval and eight-entry minimum requirements, then explicitly requested publication of the seven sourced dock events. `timelineEvents` in `src/features/timeline/events.ts` renders through `TimelineDock.tsx` on `/through-time` in both development and production. Source accuracy, date treatment, source links, keyboard/touch access and no-JavaScript reading remain required. Existing long-form article drafts and policy drafts are not promoted by this change.

## Release gates

`npm run release:check` defaults to `--scope=v1`. It checks:

- Exact public corpus integrity and nonempty active data. Public v1 has no minimum timeline count or per-event reviewer-record gate.
- Real support/security contacts and approved terms, privacy and accessibility pages that match the public site's actual storage/logging behavior.
- Genuine visual, supplied-art rights, idea editorial, legal, independent security, manual accessibility, performance, public hosting, public deployment and production-authority evidence.
- A canonical non-loopback production HTTPS origin, secure public hosting and disabled community.
- Current script results and public acceptance/ASVS evidence bound to the exact candidate and the `v1` scope.

V1 does not require Supabase, database connections, SMTP, CAPTCHA, staff accounts, private buckets, community moderation staffing or database-plus-object restore. Those are deferred features, not missing v1 infrastructure. Do not weaken their retained policies to make a future community launch easier.

`npm run release:check -- --scope=community` retains the original full release gates and requires explicit community enablement. A `scope=v1` automated report can never satisfy that check. Community launch needs its own complete browser/provider/database/recovery evidence, real staff and independent assessment; changing one environment flag is not approval.

## Evidence mapping

[v1-acceptance-evidence.json](v1-acceptance-evidence.json) has **70 required rows**: 36 unchanged public requirements, 28 explicitly adapted public portions of mixed requirements, and six new disabled-boundary/configuration scenarios. Its `sourceMapping` accounts for every original row; **84 original rows are deferred** to inactive community v2. Mixed rows state exactly which SQL/account/staff clauses are deferred. The original [148-row matrix](acceptance-evidence.json) is unchanged and retains its historical evidence and gaps.

[v1-asvs-evidence.json](v1-asvs-evidence.json) identifies **114 public web/content/build/hosting/perimeter controls** and records the other **139 controls** outside this public runtime scope. It does not mark any control independently assessed or approve an exclusion. Hosting, secrets, logs, TLS, CSP, content encoding, dependency security and dormant-route protection remain active concerns. Narrow exclusions within the public set need a real reviewer and a reason. The full [253-control register](asvs-5.0-l2-evidence.json) remains the community record. No ASVS compliance claim is made.

Old full-community candidate passes stay historical. New public rows initially remain NOT RUN until actual public-scope evidence is recorded; narrowing the product does not turn an old partial row into a full pass. Source/build identity and final runs are maintained by the release report.
