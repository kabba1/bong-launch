# BONG implementation plan

**Goal:** Implement the complete supplied BONG product in this separate application folder, preserving exact content and enforcing private community lifecycle controls.
**Architecture:** Next.js App Router, strict TypeScript, dynamic nonce-bearing HTML, immutable hashed content. Server-only Supabase Auth/Storage adapters and restricted PostgreSQL transactions; private `bong` schema, RLS, no browser provider client.
**Spec:** Supplied BONG handoff, reviewed before implementation. The application-local guardrails, acceptance matrix and release report carry the implementation requirements and remaining owner gates for this standalone checkout. Local implementation does not authorize public launch.

## Global constraints

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


