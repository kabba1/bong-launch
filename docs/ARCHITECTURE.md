# Current architecture

BONG v1 uses Next.js App Router, React and TypeScript to serve checked local public content on Netlify. Exact dependency versions and integrity records are in package.json/package-lock.json; Node 24.19.0 is used locally and in CI. No framework or runtime architecture changes are part of this cleanup.

## Public delivery

The generator fetches a validated same-origin corpus once, draws locally, and persists its deck in browser storage with cross-tab coordination. All 1,000 canonical idea pages and share images are prerendered. Through Time renders the seven source-backed events as scrolling scenes with ordinary HTML, keyboard navigation and reduced-motion support. Separate long-form articles remain drafts. The aqua design uses the supplied transparent art with local Bricolage Grotesque and DM Sans fonts.

Public pages require no account, database, email, CAPTCHA, storage provider, wallet or AI service. `COMMUNITY_ENABLED` must be false/unset. Private pages redirect to Coming Soon; private APIs deny before provider work; privileged migration, staff and maintenance commands also refuse the dormant scope. Credentials alone cannot activate it.

## Security and cache behavior

`next.config.ts` supplies static public headers. `scripts/netlify-headers.ts` generates ignored public/_headers for CDN assets. The private proxy supplies its own baseline on early denials and redirects. Public HTML caching remains under Next/Netlify control, hashed assets are immutable and the corpus manifest revalidates. Withdrawn ideas retain their protected 410 handling.

The existing public CSP permits first-party inline Next hydration with `script-src 'self' 'unsafe-inline'`, while blocking script attributes, eval, third-party script origins, objects and frames. This is a known tradeoff, not a nonce-based policy. Public v1 has no user HTML; retain text escaping and checked content. Private HTML keeps request nonces and no-store behavior. Style attributes retain the existing narrow exception. This cleanup does not loosen any CSP/header rule.

APP_ENV=production enables the existing production HTTPS/header/indexing behavior. Staging/preview/local stay noindex. Netlify's production context is currently staging; production validation and the intentional transition are explained in [V1_LAUNCH.md](V1_LAUNCH.md).

## Retained private work

The dormant BFF, transaction-local actor, restricted SQL role, RLS, CSRF/shared limits, staff MFA and sanitized/private media remain intact. PGlite exercises database policy and negative tests without a hosted database. [Community-v2 notes](future-community-v2/README.md) cover future setup and operation; these are not v1 dependencies.

## Tooling

GitHub CI performs a clean install and runs the same fresh technical-check command used locally. Historical evidence is not consulted. The runner pins the already-used Next environment loader, @next/env 16.3.6, directly as a development dependency to match Next's .env precedence. It validates the supplied environment before isolating browser/build checks under staging settings.

Existing TypeScript 6.0.3 and ESLint compatibility-adapter decisions are retained. Generator behavior, artwork, legal metadata, dependency runtime versions and Netlify settings are preserved. The prior detailed architecture and development reports are in the historical archive.
