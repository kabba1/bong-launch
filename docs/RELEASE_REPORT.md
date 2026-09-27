# Release readiness report

**Disposition: not ready for public launch.** This is an implemented application candidate with local verification, not approval to enable a public community. The required history/legal/contact/provider/staff/rights/security/restore gates were not supplied by the handoff and have not been fabricated.

## Deliverable

The application lives at `C:/Users/Mitch/OneDrive/Desktop/bong-launch`, separate from the original handoff and the pre-existing `bong-website` folder. It contains source, supplied content/artwork, exact dependencies/lockfile, private SQL migrations, automated checks and operating documentation. Scratch logs, screenshots and traces stay in the sibling handoff `.build-evidence` directory. No production infrastructure, DNS, paid resource or public deployment was changed.

Implemented surfaces: local canned generator with persisted shuffled deck/history/copy/share; canonical ideas and OG; reviewed-article timeline renderer; About/token state and legal/contact routes; member/email-code/onboarding/account UI; durable board/posts/revisions/comments/reports/profiles; staff MFA/moderation/audit/incident switches; sanitized private uploads and authorized derivatives; durable export/deletion/retention jobs; owner-only staff CLI and database migration runner.

All 1,000 original IDs and exact idea strings match the supplied CSV. There are 22 categories and no invented history articles or community activity. There is no live AI, wallet, trading or token gate.

## Evidence

The final command results and source/build/content identities are in [release-evidence.json](release-evidence.json). Verified 2026-09-27: source `6fc9a70876182ae821f35d4022c37c3a1be32bdaf1c6cfb25646de9bc618318f`, production build `ifod-872AGPJhszNIz8RK`.

| Check | Observed result |
|---|---|
| Clean install, lint, typecheck, exact content validation, production build | PASS |
| Unit / PostgreSQL integration / security tests | 28 / 30 / 45 passed |
| Production browser / automated accessibility tests | 24 / 17 passed |
| Dependency audit / secret-pattern and client-boundary scan | Zero known vulnerabilities / PASS |
| Release authorization check | BLOCKED, exit 1; 40 unresolved gate messages |

These are 144 automated cases. The 148 full acceptance scenarios retain 8 PASS, 104 PARTIAL and 36 NOT RUN dispositions; suite success does not clear their missing assertions.

The complete 148-scenario matrix is `acceptance-evidence.json`; PARTIAL and NOT RUN remain release blockers. `REVIEW_FINDINGS.md` records repaired defects and regressions. `PERFORMANCE.md` describes repeatable local throttling measurements and their limits. Desktop/mobile screenshots and raw command evidence are linked from the evidence records.

Real PostgreSQL policies were executed in isolated PGlite databases, including restricted grants, direct cross-user RLS, revisions, moderation, quotas, media ownership and lifecycle retries. A 10,000-post/100,000-comment fixture checks bounded query plans. This does not establish hosted Supabase access controls, actual network-pool isolation or multi-instance concurrency.

Browser tests use the local production build. Explicitly identified UI tests intercept DTOs only to test presentation/failure recovery; those fixtures are confined to tests and are not persistence or provider evidence. Real account/staff success journeys cannot be certified until the actual isolated provider environment is configured.

## Required before release

1. Supply at least eight genuinely sourced and reviewed historical articles, with real editorial and asset-rights records.
2. Supply real operator/support/security contacts and reviewed legal, community, accessibility, privacy/retention information. Approve the supplied art and idea corpus, visual design, token state and any real social identifiers.
3. Approve hosting/provider region, plans/budgets and acceptable-use requirements; configure isolated SMTP, Supabase, private buckets, CAPTCHA and trusted host identity. Keep participation closed until verified.
4. Run real staging journeys and adversarial provider REST/RPC/GraphQL/Storage checks, pool/concurrent-session isolation, refresh races, private-media expiry, scheduled jobs/alerts and lifecycle failure/recovery drills.
5. Name trained MFA-protected moderators/admins and confirm support/on-call coverage, recovery, appeals and incident procedures.
6. Obtain independent human security assessment with control-level ASVS evidence, manual keyboard/screen-reader/zoom/real-device accessibility checks, and owner visual acceptance.
7. Measure remaining-route/hosted performance and approved load/abuse budgets; test actual database-plus-object backup/restore and deletion/takedown reapplication.
8. Re-run all checks for the exact candidate, resolve every mandatory scenario, and record explicit production release authorization. `release:check` must remain nonzero while any gate is unresolved.

## Start and operate

`npm ci`, then `npm run build` and `npm run start` serves the production preview at `http://127.0.0.1:3210`. With no private backend configured, community requests report unavailability and the generator continues. No submission is reported saved unless its API commit succeeds.

See `SETUP.md` for configuration, `API.md` for contracts, `RUNBOOKS.md` for moderation/retention/recovery/backup/incident procedures, `CONTENT_AND_RELEASE.md` for approvals, and `.env.example` for blank secret settings. Keep owner/migration credentials out of the request-serving environment.
