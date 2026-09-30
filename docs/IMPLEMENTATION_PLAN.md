# BONG implementation plan

**Goal:** Implement the complete supplied BONG product in this separate application folder, preserving exact content and enforcing private community lifecycle controls.
**Architecture:** Next.js App Router, strict TypeScript, dynamic nonce-bearing HTML, immutable hashed content. Server-only Supabase Auth/Storage adapters and restricted PostgreSQL transactions; private `bong` schema, RLS, no browser provider client.
**Spec:** Supplied BONG handoff, reviewed before implementation. The application-local guardrails, acceptance matrix and release report carry the implementation requirements and remaining owner gates for this standalone checkout. Local implementation does not authorize public launch.

## Approved v1 scope revision (2026-09-27)

The owner's new instruction supersedes the original all-features launch scope. Public v1 retains the canned generator, exact corpus, timeline renderer/content controls, About/lore and factual $BONG information. Community is a polished Coming Soon page with only configured official social links. Accounts, forum, moderation, private database/Auth/email/CAPTCHA/uploads and lifecycle services are preserved for a future community release, disabled by default.

Plan and acceptance mapping:

1. Preserve source CSV bytes across Git checkout while retaining exact IDs/text and strict tamper checks (DATA-01–09; CSV regression).
2. Add a default-off server community boundary before private page rendering and API handling; retain nonce CSP, no-store/private responses and every future community security control (V1-01–03, SEC-01/05–08/14/17).
3. Remove public account/submit/report/session dependencies, add Coming Soon and conditional official links, preserve generator/timeline/About/token behavior and unrelated design (V1-01/04/05, GEN-01–15, TIME-01–09, UX-01–09; GEN-16 discussion is deferred).
4. Separate v1 release requirements from deferred full community requirements, without relabeling unknown evidence as passed (OPS-01/11/13; v1 acceptance and ASVS registers).
5. Verify exact content, current unit/integration/security suites, a fresh production build, public v1 browser/accessibility behavior and selected preserved community regressions. Bind new evidence to this candidate and retain historical failures/fixes.

Implementation and verification only. No commit, push, deployment, provider provisioning or unrelated redesign is part of this scope-change turn. See V1_SCOPE.md and RELEASE_REPORT.md for the resulting gates. The earlier plan below describes preserved implementation history; its full-community launch gates apply to the future release.

**Scope revision completed and locally verified:** all five steps above are implemented. Final results: unit 42, SQL integration 30, security 60, public browser 22, axe 10 and preserved community browser 7 passed; lint, typecheck, exact content, production build, audit and secret scan passed. The default v1 release check remains blocked by 20 actual content/owner/public-host/evidence findings; the separate community check retains 44 full-scope findings. Historical failed checks and corrections are recorded in RELEASE_REPORT.md and release-evidence.json. No owner, independent reviewer or hosted-provider result was fabricated.

## Focused public brand/UI refinement (2026-09-27)

Owner-directed follow-up to the verified public v1 scope. Preserve the existing application, source corpus, artwork, dependencies and disabled community boundary. This is a presentation/copy pass; it does not reopen the earlier architecture or v2 implementation plan.

1. Refine the existing generator presentation, image/button interaction cues, result hierarchy and small reduced-motion-aware reveal; preserve deck/storage/copy/share behavior (GEN-01–15, UX-01–05).
2. Replace lower-home feature-card presentation with two editorial destinations; refine header/footer and concise public voice, retaining fixed-corpus transparency on About (UX-01/07, V1-01/04/05).
3. Hide timeline search below 12 published entries, ignore queries below that threshold, and present the zero state and future real entries as an explicitly labeled fiction/history archive (TIME-01–09, V1-05).
4. Refine the intentional Community teaser and five-section About/$BONG page without enabling private features or inventing links, facts or token information (V1-01–05).
5. Run relevant public unit/browser/accessibility checks and production build. Capture home before/after generation plus timeline, Community and About at 1440/1024/768/390 px. Inspect screenshots and make one focused correction pass (UX-01–09, OPS-05). Record results in BRAND_UI_REFINEMENT.md. Existing release approvals remain open; no deployment, provisioning, DNS, community enablement, commit or push is included.

**Completed:** all five steps, screenshot inspection and one focused correction pass. Lint, typecheck, exact content, production build, 32 relevant unit tests, 25 public browser tests and 11 axe checks passed. The unchanged release check remains blocked by 20 existing gates and three previous-candidate evidence bindings. See [BRAND_UI_REFINEMENT.md](BRAND_UI_REFINEMENT.md) for current scoped evidence and limits; previous full-scope records remain historical.

## Global constraints

### Supplied artwork replacement (2026-09-28)

Replace the placeholder illustration with the owner's exact `bong.png`, preserve transparency, regenerate the existing optimized variants, update homepage/Community URLs to avoid stale immutable caches, and correct alt text. Preserve layout, copy, generator behavior and community boundaries. Verify source equality, optimized images, lint/types/production build, targeted public browser/accessibility checks and desktop/mobile appearance (UX-01/02/04/07, GEN-01/02, V1-01/04). No corpus, backend, dependency or release-policy change; no deployment or push.

**Completed:** original bytes/alpha preserved; all three variants replaced; versioned URLs and alt text updated. Lint, types, content validation, production build, nine targeted public browser tests and eleven axe checks passed. Desktop/mobile image loading, served-byte identity, artwork clicks and screenshots checked. See [ASSETS.md](ASSETS.md).

### Owner-directed v1 simplification and public policies (2026-09-28)

Apply the owner's page-by-page copy and presentation decisions without changing the public-v1 feature boundary or redesigning unrelated surfaces:

1. Reduce Home to the headline, supplied bong control, one generator button and a result containing only the idea plus copy/share actions. Preserve deck persistence, exact idea data, errors, keyboard access and hidden verification identifiers; remove the visible history and repeated prompts (GEN-01–15, UX-01–05).
2. Tighten Through Time, Community and About language. Configure only the two owner-supplied official social URLs, keep historical fact/fiction labels and sources, and preserve the verified-live-token branch (TIME-01–09, V1-01/04/05).
3. Publish concise owner-approved Privacy, Terms and Accessibility pages that match the public v1 storage, logging, account, third-party-link and accessibility behavior. Keep monitored contacts and independent legal/manual review as separate release gates (OPS-11/13, V1-05).
4. Update acceptance assertions first, run focused red/green checks, then verify lint, types, source-content equality, production build, public browser/accessibility behavior and retained security boundaries. Record genuine failures without weakening release checks (DATA-01–09, SEC-01/05–08/14/17, OPS-05/13).

**Completed and locally verified:** the requested page copy/layout, configured X/Telegram links and owner-approved public policies are implemented. Lint, typecheck, exact 1,000-row content validation, production build, unit (58), integration (30), security (60), public browser (28), axe (11) and one future-community regression all pass. The dependency audit reports zero vulnerabilities and the secret scan passes. One throttled-mobile performance run recorded a 114.3 ms draw against the unchanged 50 ms lab target; identical later runs passed with 38.4 ms and 49.6 ms worst draws. The failure remains documented as timing variability. The v1 release check remains nonzero with 20 real content, contact, review, hosting, production and evidence blockers; the three public policy-content blockers are now resolved. No database, Auth, email, CAPTCHA, upload, wallet or community feature was enabled by this pass. See [V1_COPY_AND_POLICY_REFINEMENT.md](V1_COPY_AND_POLICY_REFINEMENT.md).

### Focused public copy edit (2026-09-27)

Apply the owner's exact replacements/deletions to public v1 presentation only, preserving the prior refinement and all behavior. Steps: (1) simplify homepage, destinations, footer, timeline, Community and About copy; (2) remove marketing quantity claims from metadata, idea wrappers and code-rendered share images while preserving exact content; (3) update legitimate text expectations and run lint, types, content integrity, relevant public unit/browser/axe checks and a production build; (4) inspect desktop/mobile pages once for gaps or heading problems. Mapping: GEN-01–15, DATA-01–09, TIME-01–09, UX-01–09, V1-01–05. No design-system, dependency, private-backend or release-policy changes; no deployment or push. Results will be recorded in COPY_EDIT.md.

**Copy work and verification complete:** lint, types, content, build, 33 unit tests, 25 functional/copy browser checks and 11 axe checks passed. The full browser run also had one performance-test failure (77.7 ms mobile draw versus 50 ms); one isolated repeat passed at 34.4 ms worst. No limit or implementation was changed to obtain that repeat. Both observations and the unresolved timing variability are retained in [COPY_EDIT.md](COPY_EDIT.md). Desktop/mobile inspection found no deletion-related problem; no copy change was blocked.

- All 1,000 source strings and IDs; 22 categories; content hash derived from emitted bytes.
- Zero invented history/staff/reviews/accounts/activity/contact/contract details. No live AI or wallet dependency.
- Origin/CSRF, shared limits, registered sessions, approved-factor staff MFA and private sanitized media remain mandatory.
- Test failures remain blockers. External/manual approval must be evidence, never a default true flag.
- Folder contains application source, reviewed assets/content, migrations, reproducible checks and operating documentation. Scratch logs/screenshots/tool downloads stay in sibling handoff `.build-evidence`.

## Work and interfaces

### 0 — Inspect and lock decisions
- [x] Read complete spec, docs, schemas and source inventory; compare every source record.
- [x] Separate folder; preserve pre-existing `bong-website`.
- [x] Pin current stable dependencies and lockfile; record supported Node and advisory checks in `docs/ARCHITECTURE.md`.
- [x] Generate all 148 acceptance tracking rows, initially NOT RUN, in `docs/acceptance-evidence.json`.

### 1 — Identity and generator (DATA-01–09, GEN-01–16, UX-01/04/05/07)
Files: `scripts/content.ts`, `src/features/generator/{deck,types,Generator}.tsx/ts`, `src/app/{layout,page}.tsx`, `src/styles/globals.css`, `src/app/idea/[ideaId]`, public assets.
- [ ] Write and run failing exact-source, malformed-CSV, deterministic-build, full-cycle, corruption/reset and cycle-boundary tests.
- [x] Implement deterministic content validation/build, hash manifest and SQL catalog seed; canonical server text and safe OG.
- [x] Build responsive orange/paper/ink design with preserved art, keyboard-safe actions, deck persistence/locks/history.
- [ ] Verify tests, production preview, 390×844 and 1440×1000 screenshots before expanding page styling. Owner visual acceptance stays a release gate.

### 2 — Timeline and public pages (TIME-01–09, DATA-10, OPS-11, PRIV-08)
Files: `src/features/timeline`, public route pages, `content/site.json`, approved legal content.
- [x] Validate published JSON review/source relationships/date/rights; test draft exclusion and invalid sources.
- [x] Render chronological search/detail/fiction/facts/sources/neighbors; empty approved collection stays honest.
- [x] Add About/token states, legal/contact/security text routes, environment-aware sitemap/robots; no invented values.

### 3 — Database and auth boundary (AUTH-01–19, SEC-01–08/11–16, OPS-02/03)
Files: `supabase/migrations`, `src/server/db`, `src/server/security`, `src/features/auth`, `src/app/api/[...path]/route.ts`.
Interface: `Actor {userId:string|null,sessionId:string|null,aal:'aal1'|'aal2',requestId:string}`, `withActorTransaction(actor, callback)`; SQL actions exposed only via restricted grants/policies. API envelopes `{data,requestId,page?}` / `{error:{code,message,fields?},requestId}`.
- [ ] Write real PostgreSQL negative-policy tests first, apply clean migrations and check actor A/B/anonymous isolation and owner/runtime grants.
- [x] Implement strict input/body/CSRF/origin boundary, shared SQL limits, narrow provider Auth integration, host-only HttpOnly cookies and verified/registered sessions.
- [x] Implement onboarding, refresh/revocation, approved-factor MFA, reauthentication and owner-only bootstrap/recovery command.

### 4 — Community and media (BOARD-01–15, COMMENT-01–08, MEDIA-01–14, SEC-09/10)
Files: `src/server/services`, `src/server/media`, board/member routes and client components.
- [ ] Test pending/public revision binding, same-post replies, concurrent version checks, idempotency and deletion before implementing repository actions.
- [x] Implement durable feeds/search/cursors, posts/revisions/comments/profiles/reports and private owner views. Inputs never define actor/privilege fields.
- [x] Implement streaming caps, raster decode/rotation/re-encode, private variants, approved-revision media visibility, TTL, orphan deletion.
- [x] Build composer with session draft recovery, preserved failed inputs, committed status and image alt text.

### 5 — Moderation/lifecycle (MOD-01–10, PRIV-01–07)
Files: moderation/account routes, server jobs, owner commands.
- [ ] Test stale review conflicts, self-review, staff privilege matrix and fresh MFA; implement exact candidate review with audited decisions.
- [x] Implement trust/suspension/ban, read-only/upload switches, privacy-preserving reports and audit.
- [x] Implement private bounded export/deletion jobs, state freeze, retries/backoff, retention, storage/provider cleanup and last-admin safeguard.

### 6 — Verification and handoff (all 148 IDs, OPS-01–13, SEC-17, UX-02/03/09)
- [x] Run required script contract, production browser/axe checks, negative requests, secret/dependency scans and separate-agent code review; release:check correctly returns BLOCKED. Independent human security review remains open.
- [x] Map actual evidence and unresolved manual/staging checks; do not relabel lack of infrastructure as a pass.
- [x] Supply local/staging setup, maintenance/moderation/recovery/backup/incident runbooks, exact version/report and release gate.
- [x] Keep publication blocked until actual editorial/legal/provider/rights/moderator/security/owner gates pass.

## Review focus

1. Pooled connections must not retain A's actor when reused by B/anonymous (SQL negative tests).
2. Pending edits/images must not replace or disclose approved public content (revision-policy and browser tests).
3. Interrupted submissions retain draft/idempotency key and never duplicate or fake success (API and UI tests).
4. Suspended/deleting/revoked users and unknown provider sessions cannot regain authority via refresh (session tests).
5. CSV quoting, stale browser storage and backend failure must never truncate corpus or take down the generator (content/deck/outage tests).

## Current implementation status (2026-09-27)

Phases 1–5 have application code, durable SQL policies/lifecycle, user/staff interfaces and local verification. The unchecked phase checklists combine implementation with full release verification; their hosted/browser/manual clauses remain open until evidence exists. Local verification includes exact content equality, unit/security/real PostgreSQL policy tests and production browser/axe checks. Review corrections and negative regressions are recorded in docs/REVIEW_FINDINGS.md. The final status and 148-row evidence matrix separate PASS, PARTIAL and NOT RUN; they control completion claims, not this coarse checklist.

## Progress and release distinctions

Initial input audit PASS. No articles, approved legal copy, real operator/contact/provider/staff data supplied. Public launch: OWNER INPUT REQUIRED / EDITORIAL BLOCKED / INFRASTRUCTURE BLOCKED / SECURITY REVIEW PENDING. Final locally executed results, source/build identity and unresolved gates are recorded in `docs/release-evidence.json`, `docs/acceptance-evidence.json`, and `docs/RELEASE_REPORT.md`. Unchecked mixed verification steps retain their staging/manual requirements.

## Owner-requested maintenance (2026-09-30)

Implement the four supplied tasks in order, with one commit per task. Use the existing pinned Next 16.3.6 / React 19.3.0 / TypeScript 6.0.3 stack. Keep approvals, token mode, legal JSON, source CSV/idea text, dormant community code and Netlify APP_ENV unchanged. GitHub push and deployment of the existing noindex Netlify site are authorized by the owner; this does not clear release approvals.

- [x] Task 1 (SEC-14, OPS-01): replace local user paths with relative references; add a repository scan to the existing unit suite and prove it catches the current leak. All task checks pass after excluding generated Netlify output from lint; see the maintenance report.
- [ ] Task 2 (SEC-07/08/16, GEN-15, DATA-07/08, TIME-08, OPS-05, V1 dormant boundary): move static public headers to Next config, remove public dynamic rendering, enumerate idea/OG/timeline params, retain private nonce/no-store denial and verify built HTTP/browser behavior. Document the public CSP tradeoff and inspect the build route table.
- [ ] Task 3 (TIME-04, UX-08/09, OPS-11): rewrite About lore inside its existing sections, visibly label fiction, explain sourced history, generator and Community Coming Soon; retain token behavior and flag copy for re-approval.
- [ ] Task 4 (TIME-01/02/08/09, DATA-10, OPS-13): verify draft schema, generated/public exclusion, unresolved references and published-count release gating with isolated fixtures if no supplied draft files exist.

After each task run lint, typecheck, content:validate, test:unit, test:integration, test:security, build, test:e2e and test:a11y. Run production browser suites sequentially because they own the same local port. Record actual failures and corrections in [MAINTENANCE_REPORT.md](MAINTENANCE_REPORT.md); release:check must remain blocked. Review the final four-commit diff, push to GitHub, verify the matching Netlify deployment and smoke-test its headers and dormant-route denial without changing launch flags.


