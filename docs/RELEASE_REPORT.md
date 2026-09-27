# Public v1 release readiness report

**Current scope:** public generator, idea links, reviewed timeline, About/lore, $BONG information and Community Coming Soon. Community/account/database/provider/upload functionality is preserved for v2 and disabled by default. V1 needs no private-service provisioning or credentials.

**Public launch remains subject to owner/content and review gates.** At least eight genuine reviewed timeline entries, approved public legal/contact/rights information, public security/accessibility/visual/performance/hosting review and explicit production authority are still required. Provider mail/CAPTCHA/SQL/staff/private-bucket/restore requirements are deferred to future community v2, not v1 infrastructure blockers.

## Candidate and verification

The application is `C:/Users/Mitch/OneDrive/Desktop/bong-launch`, separate from the original handoff and earlier website folder. It preserves all 1,000 exact idea IDs/texts and 22 categories, supplied artwork, locked dependencies, content schemas and retained private implementation. There is no live AI, wallet, trading or token gate. No infrastructure, DNS, paid service or production deployment was changed.

The source/build identity and observed automated results are recorded in [release-evidence.json](release-evidence.json), explicitly labeled `scope: "v1"`. Production preview build: `hFl3CNZJ89DXOMCMqUjPA`. The source fingerprint includes the original CSV and `.gitattributes`; documentation and generated build caches are excluded. Prior full-community results are preserved in [history/pre-v1-scope-release-evidence.json](history/pre-v1-scope-release-evidence.json), with the original full matrices unchanged.

The new [v1 acceptance map](v1-acceptance-evidence.json) contains 70 required public scenarios and maps every original requirement. Statuses reflect the specific observations and remaining gaps for each row. The [public ASVS map](v1-asvs-evidence.json) identifies 114 controls for independent review; all remain NOT RUN. No compliance, owner approval or blanket exclusion is inferred from passing engineering tests.

| Verification | Observed result |
|---|---|
| Lint, typecheck, exact content validation, production build | PASS |
| Unit tests, including CSV Git checkout and scope-policy regressions | 42 / 42 PASS |
| Retained real PostgreSQL/WASM integration tests | 30 / 30 PASS |
| Security tests, including disabled APIs, seven HTTP methods and private CLI subprocesses | 60 / 60 PASS |
| Public v1 production browser tests | 22 / 22 PASS |
| Automated accessibility checks | 10 / 10 PASS, no axe violations |
| Separate opt-in community browser regressions | 7 / 7 PASS |
| Dependency audit | Zero reported vulnerabilities |
| Source/example/browser-bundle secret scan | PASS |

That is 164 tests in the default suites plus seven preserved community browser regressions. The production browser tests confirm public pages avoid account links, community API calls and third-party provider requests; old private URLs redirect to Coming Soon, while APIs return a truthful disabled response. Configured/missing/unsafe social values are covered by isolated rendering tests. Screenshots of Coming Soon were inspected at 1440 px and 390 px. No unrelated visual redesign was made.

The local six-run homepage lab passed its comparison targets: median LCP 256 ms desktop / 836 ms throttled mobile; median CLS 0.0028 / 0.0009. See [PERFORMANCE.md](PERFORMANCE.md) for measured conditions and limits. Axe, browser emulation and local timings do not establish manual accessibility, physical-device behavior, hosted multi-route performance or a production load test.

**Corrected failures:** Git had stored LF-normalized CSV bytes and broken the source hash contract; the source now retains its exact CRLF bytes through actual Git checkout tests. The expected source hash and all 1,000 texts are unchanged. A new browser test initially failed to load a JSON import, then passed after the Node-compatible import attribute was added. Regression tests also exposed missing default-off boundary/migration behavior and release-policy scope mistakes before their corrections. Red/green logs remain in the sibling handoff evidence directory. No current automated check has an unresolved failure.

Release checks themselves remain **BLOCKED**, with nonzero exit status: public v1 still lacks genuine content and owner/hosted/independent evidence. The explicit community check additionally requires its retained full provider/staff/security/lifecycle evidence. These are real release gates, not passing checks. No deployment, DNS change, paid provisioning, commit or push was performed during this scope change.

## Public v1 release requirements

1. Supply at least eight real historical articles with genuine claim-level source/review and asset-rights records. Keep unsupported fiction separate from history.
2. Provide real monitored support/security contacts and approved terms/privacy/accessibility copy matching the public site's actual storage and hosting logs. Confirm artwork/idea rights, visual design and actual social/token configuration.
3. Verify public hosting plans/region/budget, protected preview, canonical non-loopback HTTPS origin, CSP/cache/headers, publishing access, alerts and incident owner.
4. Prove public pages and generation do not call private services and all direct dormant API/private-page/privileged CLI paths remain closed, even with credentials present.
5. Complete independent public-scope security assessment, manual accessibility/real-device/owner visual review and measured public performance/load checks.
6. Bind final script, scoped acceptance and ASVS evidence to the exact candidate and explicit v1 scope; obtain production authorization before deployment/DNS changes.

The default `npm run release:check` remains nonzero while any applicable public gate is unresolved. It does not demand private provider configuration. `COMMUNITY_ENABLED` must remain false/unset even if someone configures credentials accidentally. Official X/Telegram URLs can be supplied when ready; absent values render no invented destination and do not prevent public operation. Token information stays in its existing prelaunch mode until verified live values are supplied.

## Preserved community v2

The full [148-row matrix](acceptance-evidence.json), [253-control register](asvs-5.0-l2-evidence.json), migration/policy tests and implemented private lifecycle remain intact. Community launch uses `npm run release:check -- --scope=community` and its own complete scope/candidate evidence. Real Auth/email/CAPTCHA/MFA, hosted direct-access and TCP pool tests, private media/expiry, staffing, retention/alerts and SQL-plus-object restore remain required before that separate release. Nothing in v1 weakens origin/CSRF, RLS, session checks, MFA, private media or lifecycle controls when community is enabled.

## Preview and operate

`npm ci`, `npm run build`, then `npm run start` serves the public preview at `http://127.0.0.1:3210`. No backend is needed. Read [SETUP.md](SETUP.md), [RUNBOOKS.md](RUNBOOKS.md), [CONTENT_AND_RELEASE.md](CONTENT_AND_RELEASE.md) and [V1_SCOPE.md](V1_SCOPE.md). Former private operations must not be started for public v1; use public content/hosting procedures only.
