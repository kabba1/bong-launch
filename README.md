# BONG

A curated idea generator and moderated community, built from the supplied BONG specification. This is the standalone application directory; its source corpus, artwork, implementation notes and release gates are included here.

**Public launch is blocked.** Missing owner-approved history/legal/rights/contact information, real provider configuration, independent security review, and staging/restore evidence are release gates. `release:check` deliberately exits nonzero until they are supplied and verified. A working local generator does not mean that accounts or uploads are cleared to launch.

## Run locally

Use Node **24.19.0** (Node 24 LTS). From this folder:

```powershell
npm ci
npm run content:build
npm run dev
```

Open `http://127.0.0.1:3210`. The generator, idea permalinks, timeline renderer and informational pages do not require a backend. Community calls fail truthfully when the private backend is unavailable. There are no invented posts or accounts.

For a production-build preview:

```powershell
npm run build
npm run start
```

Stop the development server before starting the production server on the same port. No cloud project or paid service has been created by this build.

## Checks

```powershell
npm run lint
npm run typecheck
npm run content:validate
npm run test:unit
npm run test:integration
npm run test:security
npm exec -- playwright install chromium
npm run build
npm run test:e2e
npm run test:a11y
npm run security:scan
npm audit --audit-level=high
npm run release:check
```

Integration tests execute real PostgreSQL SQL, roles, policies and constraints in isolated PGlite databases. They do **not** certify a hosted Supabase deployment, TCP/TLS pool behavior, or direct REST/RPC/GraphQL/Storage policy configuration. Those tests and actual provider flows remain mandatory staging evidence. Browser tests run against the production server. The ordinary local suite never signs a fabricated user into production or emits real email.

## Content

The original CSV, all 1,000 IDs/texts, and all 22 categories are retained. `content:import` compares the exact approved source hash and generates structured content; `content:validate` checks equality and artifact drift; `content:build` emits the immutable corpus plus its manifest and SQL catalog. The browser fetches that corpus once and generates locally without AI or database requests.

Source artwork is preserved in `assets/bong-logo.png`; optimized delivery variants are in `public/images`. `npm run assets:build` reproduces them. Artwork ownership must still be confirmed. Fonts are bundled under the SIL Open Font License; see `docs/ASSETS.md`.

No approved timeline articles were supplied. Place genuine reviewed JSON in `content/timeline`, satisfying `schemas/timeline-entry.schema.json`; drafts stay out of public artifacts. Full launch requires at least eight independently checked articles. Do not fill review fields with invented people.

Approved operational/legal pages live in `content/legal/{privacy,terms,community-rules,accessibility}.json` with `title`, `version`, `approvedBy`, `approvedAt` and `sections: [{heading, paragraphs: string[]}]`. Missing pages explicitly say approval is pending and do not pretend to provide legal coverage. See `docs/CONTENT_AND_RELEASE.md` before publishing.

## Private backend and release

Read `docs/SETUP.md`, `docs/API.md`, `docs/RUNBOOKS.md`, and `docs/RELEASE_REPORT.md`. `.env.example` contains empty secret fields and closed participation flags. Enter real secrets through approved environment/secret stores; never commit them. SQL migrations and staff grants use distinct owner-operated identities; the ordinary website uses `bong_runtime` only.

The release evidence and all 148 acceptance scenarios are tracked in `docs/acceptance-evidence.json`. Keep unknown/blocked requirements visible. The independent security assessment is a human release gate, not an automated test badge.

