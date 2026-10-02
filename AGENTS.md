# BONG application

The current public implementation is the v1 product baseline. Read [README](README.md), [V1 launch](docs/V1_LAUNCH.md) and [content map](docs/CONTENT_AND_RELEASE.md). The owner's current instructions supersede the archived generated specification; archived matrices, approval records and old plans are not public-v1 release gates.

Preserve all 1,000 supplied IDs and exact idea text, the byte-exact source CSV and .gitattributes rule. Preserve the seven sourced scrolling timeline events, approved character direction, supplied artwork, configured social links and unlaunched token state. No live AI, wallet, trading, invented historical facts, accounts or activity. Do not redesign during repository cleanup.

Community stays disabled. Public pages must work without database/Auth/email/CAPTCHA/private storage. Preserve dormant private route/API/CLI denial, restricted BFF/database role, RLS, authorization, CSRF/shared limits, staff MFA, private sanitized media and lifecycle behavior. Never introduce a second private write path or expose secrets.

Use `npm run release:check` for fresh lint, types, content, unit/integration/security, build, secret scan, dependency audit, browser and accessibility checks. It does not prove human review or authorize publication. Production configuration has an explicit verification mode. [Future Community-v2](docs/future-community-v2/README.md) retains a separate historical framework. Record actual failures; never invent approval identities, dates or evidence.

Keep exact stable dependencies and document material architecture changes. The current cleanup plan is [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). Existing acceptance IDs in tests are labels, not obligations to complete archived spreadsheets. Netlify is Git-connected: do not push/deploy, change DNS/environment state or provision infrastructure unless the owner authorizes that action.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
