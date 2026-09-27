# Architecture and dependencies

Decision date: 2026-09-27. The owner explicitly narrowed v1 to the public generator/timeline/About/lore/$BONG and Community Coming Soon. Next.js App Router and strict TypeScript serve checked local content with no active database, provider Auth/email, CAPTCHA or private storage dependency. Vercel remains a proposed public host, not provisioned or approved. Supabase/PostgreSQL/private community code is retained for separately gated v2.

## Active public v1 boundary

`src/lib/launch-scope.ts` makes community opt-in only when `COMMUNITY_ENABLED` is exactly `true`. Default v1 denies former community API and private route operations before provider/database/session/challenge work; supplied credentials do not open the boundary. Migration, staff and maintenance CLI operations are also disabled. The public site presents Coming Soon without simulated posts, login forms or operational account claims. New v1 tests exercise direct requests as well as navigation.

Public release checking defaults to `scope=v1`; the full original gate is available only via `--scope=community`. Evidence requires an exact candidate and matching scope. The public acceptance map explicitly adapts mixed original rows and defers inactive clauses; the original full matrices remain unchanged. All actual public HTTPS/CSP/output/secret/dependency controls remain active.

## Shared public delivery

Public corpus/timeline content is generated locally and read without any database or Auth call. All HTML is dynamically rendered with a fresh nonce, private no-store, and restrictive script CSP. The CSP proxy does not authenticate visitors. Hashed corpus and checked artwork/fonts remain cacheable. Public client components load same-origin content without community API calls. The preserved community clients use same-origin application APIs and HttpOnly session cookies; no browser Supabase or storage client exists.

## Preserved private boundary — community v2 only

No private capability described below is active or required for public v1. Before a community release all original security, provider and operational requirements still apply.

`withActorTransaction` verifies the actual database role then sets actor, registered session, assurance, request ID and HMAC rate identity locally within one transaction. Direct queries cannot inherit a pooled connection's previous actor. `bong_runtime` has no direct table write grants; mutations use the fixed, parameterized `bong.api` action dispatcher. Private SQL schema is absent from provider API grants. Policies protect runtime reads; narrow definer operations enforce transitions, ownership, session/MFA and audit. Owner and maintenance APIs are separately granted and use separate credentials.

Images are decoded and rewritten to bounded WebP derivatives; raw bytes never reach delivery. Private authorization checks the currently approved revision and signs for 60 seconds. Export/deletion/object cleanup uses durable leases and retry records. Lifecycle work never relies on an HTTP after-response callback.

## Dependency decisions

Exact versions and integrity data are authoritative in `package.json` / `package-lock.json`. Node 24.19.0 is the tested active-LTS runtime. Registry stable tags and primary provider documentation were checked during implementation. Major selections: Next 16.3.6, React 19.3.0, Supabase JS 2.117.2, postgres 3.4.9, sharp 0.35.5, Zod 4.6.5, Tailwind 4.3.3, Vitest 5.0.2 and Playwright 1.63.0.

TypeScript 7.0.2 failed the current typescript-eslint compatibility check. **TypeScript 6.0.3**, the newest stable in its supported `<6.1.0` range, is pinned instead. ESLint 10.11.0 is supported via the official `@eslint/compat` 2.1.1 rule adapter because bundled Next React/import/a11y plugins retain older rule-context APIs; all rules still execute. This is a tooling compatibility decision, not a weakened security gate. Both original failures remain in the build evidence.

PGlite 0.5.8 executes PostgreSQL/WASM for repeatable local policy tests without Docker. Future community production still requires TLS-verified PostgreSQL with serverless-safe unprepared statements. Local engine tests do not replace hosted tests or a real connection-pool isolation drill. No approved architecture substitution is being claimed.

Custom components use semantic HTML and native dialog behavior. `style-src-attr 'unsafe-inline'` is the documented narrow style exception; scripts do not get production unsafe-inline/unsafe-eval. The desktop/mobile theme uses the supplied orange illustration and two self-hosted licensed font families.

## Configuration naming

Implementation names `BONG_DATABASE_URL`, `BONG_MAINTENANCE_DATABASE_URL`, `BONG_MIGRATION_DATABASE_URL` correspond to the specification's runtime/maintenance/migration URLs. `BONG_OWNER_DATABASE_URL` exists only for audited owner CLI operations. Storage and Auth administration keys are split into `SUPABASE_STORAGE_SERVICE_KEY` and `SUPABASE_AUTH_ADMIN_KEY`. `MAINTENANCE_TOKEN`, `RATE_LIMIT_SECRET`, `COMMUNITY_RULES_VERSION`, `TERMS_VERSION`, and `REGISTRATIONS_ENABLED` are the implementation names for the corresponding spec settings. The application accepts exactly APP_ORIGIN, with no wildcard trusted origins. These names are fully documented in `.env.example`; no second write path is introduced.

Official references: [Next CSP](https://nextjs.org/docs/app/guides/content-security-policy), [Supabase API hardening](https://supabase.com/docs/guides/api/securing-your-api), [Supabase verified server Auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Node release lifecycle](https://nodejs.org/en/about/previous-releases).

GitHub CI actions are pinned to verified release commits: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) and [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0). Clean `npm ci` was verified on this workstation. Upstream ESLint-plugin peer warnings are covered by the runtime compatibility adapter; npm also reports unapproved optional install scripts for esbuild/unrs-resolver, but the clean-installed build/test tools execute successfully. Hosted GitHub Actions itself has not been run.


Upload/delete race controls: each private upload reserves its server-derived keys with a five-minute in-flight lease. The request holds an unreturned 256-bit cleanup capability; SQL stores only its hash. Deletion cannot finish while a live upload reservation exists, and object cleanup skips its live lease. After identity purge, the owner/session references are removed and a fixed-key cleanup tombstone remains for at most 30 days (until required object cleanup is complete). This narrow compensation authority cannot select arbitrary paths or publish content. Requeued object deletions increase a generation counter; a worker cannot mark a newer deletion complete using an older acknowledgment. No original upload bytes are retained. Real storage latency/timeout/expiry behavior remains a staging check.

## Scoped verification

The public map is `docs/v1-acceptance-evidence.json` (70 scenarios; all 148 original rows accounted for) and `docs/v1-asvs-evidence.json` (114 public controls;139 outside the inactive runtime scope). These are evidence plans, not a compliance claim. Backend-managed authentication/session/upload controls are deferred with the disabled features; public hosting, content, logs, TLS, CSP, secrets and dormant-route authorization remain review concerns. The complete community records and local regression suites remain intact.
