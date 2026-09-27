# BONG

BONG v1 is a public canned idea generator, canonical idea pages, reviewed timeline, About/lore and $BONG information, with **Community Coming Soon**. The source corpus, supplied artwork, application code and release documentation are included in this standalone folder.

`COMMUNITY_ENABLED` is disabled by default. Public v1 requires no database, Supabase, email delivery, CAPTCHA, accounts, staff or private upload service. The implemented community code is retained for a separately reviewed v2 release; credentials alone must never activate it. Direct private pages, APIs and privileged migration/maintenance/staff commands remain closed in v1.

**Public deployment still requires real content and owner approval.** At least eight genuinely sourced/reviewed timeline entries, public legal/contact/rights information, security/accessibility/visual/performance review, hosting checks and production authorization remain gates. No historical articles, official accounts, token address or approval identity may be invented.

## Run locally

Use Node **24.19.0** (Node 24 LTS):

```powershell
npm ci
npm run content:build
npm run dev
```

Open `http://127.0.0.1:3210`. Keep `COMMUNITY_ENABLED=false` or unset. Leave all private-service environment variables empty; no cloud project or paid service is needed for the public preview.

For a production-build preview, stop the development server and run:

```powershell
npm run build
npm run start
```

## Verify the public release

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

The default release check is **v1**. Local integration tests retain real PostgreSQL/WASM regression coverage for dormant community code; they do not need a provisioned database and do not certify hosted private services. Public browser/axe results must identify the v1 scope and exact candidate. Release checks remain blocked until their genuine applicable requirements pass.

The full future community gate is `npm run release:check:community` (equivalent to `npm run release:check -- --scope=community`). It preserves the original 148 scenarios, full ASVS review, private-service configuration, staff, real provider journeys and recovery requirements. Public-only evidence cannot authorize that release.

## Content and configuration

All 1,000 original IDs/texts and 22 categories are preserved. `content:import`, `content:validate` and `content:build` verify exact source equality and deterministic artifacts. The browser loads the public corpus and draws locally without AI, accounts or database calls. Generated SQL catalog output remains for future v2; deploying it is not a v1 prerequisite.

Supplied art is retained in `assets/bong-logo.png`; optimized public variants and self-hosted licensed fonts have their records in `docs/ASSETS.md`. Actual artwork rights still need owner approval. Historical entries belong in `content/timeline`; drafts remain private to the build inputs. At least eight real reviewed entries are required before public release.

Configure only genuine owner-approved social links and token state in `content/site.json`. Missing social values are omitted; prelaunch mode has no invented contract. No wallet, trading or token gate is present. Approved public legal JSON belongs in `content/legal/{privacy,terms,accessibility}.json`. Community rules and account privacy operations remain v2 concerns while those features are disabled.

Read [V1_SCOPE.md](docs/V1_SCOPE.md), [SETUP.md](docs/SETUP.md), [CONTENT_AND_RELEASE.md](docs/CONTENT_AND_RELEASE.md) and [RELEASE_REPORT.md](docs/RELEASE_REPORT.md). The current public acceptance map is [v1-acceptance-evidence.json](docs/v1-acceptance-evidence.json); the historical full matrix is preserved separately. Neither local preview nor a passing build authorizes production deployment, DNS changes or paid provisioning.
