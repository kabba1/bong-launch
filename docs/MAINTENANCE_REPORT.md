# Owner-requested maintenance — 2026-09-30

This report tracks the four requested tasks, their separate commits and actual checks. It supplements historical release evidence without rebinding or inventing approvals. Public launch remains blocked; the existing Netlify site stays noindex.

## Task 1 — Local user path

Changed `docs/RELEASE_REPORT.md` to refer to the repository as `.`. The repository source scan found that single local user path. Added `tests/unit/local-paths.test.ts`, automatically included by `npm run test:unit`, to scan every file in `docs/`, `content/` and `src/`. It detects Windows slash/backslash and Unix user paths and reports only relative filenames. No generated files were edited.

Regression check: `npm run test:unit -- tests/unit/local-paths.test.ts` ran the full unit suite and failed exactly at the existing release-report leak (59 passing, one failing test), before the documentation correction.

Final checks: `npm run lint`, `npm run typecheck`, `npm run content:validate`, `npm run build` PASS; `npm run test:unit` 60/60, `npm run test:integration` 30/30, `npm run test:security` 60/60, `npm run test:e2e` 28/28, `npm run test:a11y` 11/11 PASS. Browser output includes the runner's existing NO_COLOR/FORCE_COLOR warning. Logs are in the sibling handoff `.build-evidence/maintenance-2026-09-30/task1/` directory. All source IDs/texts and the corpus hash are unchanged.

`npm run release:check` was also run against an isolated snapshot of the committed Task 1 revision after Task 2, rather than pretending the later working tree was Task 1. It returned exit 1 with the same 20 expected release blockers. Automatic approval review rejected cleanup of that temporary snapshot with “blocked by policy” and no further reason; it remains outside the application repository with the local evidence.

The full scan including ignored files also found paths in 65 `.next` and nine `.netlify` build/trace artifacts. These are framework-generated, ignored local output, so they were not hand-edited. The committed source scan is clean. Initial lint failed with 325 errors and 6,326 warnings because ESLint traversed existing `.netlify` compiled output; `eslint.config.mjs` now ignores that generated directory alongside `.next`. Application lint rules and tests are unchanged.

## Remaining work

Task 4 and GitHub/Netlify publication are pending. Eight draft timeline files are absent: `content/timeline/` contains only `.gitkeep`. Task 4 will therefore use isolated fixtures, with no editorial content or review records added to the repository.

## Task 2 — Static public delivery

Changed `next.config.ts` for global static security headers and known-withdrawal rewrites; narrowed `src/proxy.ts` to the seven private page families and `/api`; removed the dynamic root layout; added static params to idea HTML, idea OG and published timeline detail routes. Added a static removal handler for retained 410 withdrawals and explicit dynamic configuration to private layouts. All 1,000 active ideas and OG images are generated, with dynamicParams=false for unknown IDs/slugs. No public HTML Cache-Control override was added, and Netlify configuration is unchanged.

`src/app/through-time/page.tsx` no longer reads request searchParams. `src/features/timeline/TimelineArchive.tsx` shares its original archive/search rendering with the client `TimelineSearch.tsx` enhancement. The existing 12-entry search threshold, factual summaries, fiction labels, sources and chronological reading HTML remain. Without JavaScript all published entries remain readable; query filtering needs JavaScript.

`docs/ARCHITECTURE.md` records the owner-requested CSP deviation. Installed Next 16.3.6 has experimental SRI support in Turbopack; SRI concerns emitted JS file integrity and does not authorize the generated inline hydration blocks (the built homepage has two inline script blocks without integrity attributes). Public hydration therefore uses script-src self/unsafe-inline, with script-src-attr none, no eval or third-party script origins, and all frame/object/base/form/default restrictions retained. Private requests keep fresh nonce/strict-dynamic/no-store. HSTS is production-only; non-production keeps noindex. Independent security approval is still required.

Tests changed or added: `tests/security/{public-cache,v1-boundary}.test.ts`, `tests/unit/{static-routes,timeline-presentation}.test.ts`, `tests/e2e/{public-cache,generator,resilience,public-v1}.spec.ts`. Five header/matcher tests and three built HTTP/manifest tests failed against the original dynamic candidate before the fix. The installed testing helper retains its older doesMiddlewareMatch export despite the guide's doesProxyMatch example; that initial test setup error was corrected before verifying the matcher regression. Two adjusted test assertions also needed correction: checking the whole private CSP confused its existing style allowance with script policy, and rendering only the archive omitted the parent page heading. These were test setup errors, not relaxed production requirements.

Negative requests for unknown prerendered parameters return the required 404, but Next logs `Internal: NoFallbackError`. This upstream diagnostic is retained, not suppressed or called a successful unknown page/image. `/.well-known/security.txt` still lacks the existing required expiry configuration and returns 503; Next does not cache that failed response, so it remains dynamic in the route table. It is not public HTML and no contact/expiry or successful response was invented.

Historical performance variability remains: an earlier candidate recorded a 114.3 ms throttled-mobile draw against the unchanged 50 ms target. Raw failed/passing runs remain in the sibling handoff performance-history directory; the prior copy report also retains its timing failure. The generated current performance document is regenerated by the real browser script, never hand-edited, and a later passing run does not certify hosted performance or close the manual performance gate.

Final checks: `npm run lint`, `npm run typecheck`, `npm run content:validate`, `npm run build` PASS; `npm run test:unit` 63/63, `npm run test:integration` 30/30, `npm run test:security` 66/66, `npm run test:e2e` 31/31 and `npm run test:a11y` 11/11 PASS. `npm run release:check` returns exit 1 with 20 expected blockers, including the missing eight reviewed articles, manual approvals and candidate-bound evidence. It is not a release pass. Logs are in the sibling handoff `.build-evidence/maintenance-2026-09-30/task2/` directory. The production-build table shows static public HTML, 1,000 SSG idea pages, 1,000 SSG OG images, and dynamic private routes/API only (plus the failed security.txt configuration gate).

## Task 3 — About lore

Changed only the opening and timeline paragraphs in `src/app/about/page.tsx`, plus existing expectations in `tests/unit/community-page.test.ts` and `tests/e2e/public-v1.spec.ts`. The requested pyramids/wheel/relativity/Tinder gag follows a visible strong “BONG’s version · Fiction” label. The copy explicitly calls it a bit, denies any claim of real drug-inspired people/inventions, and explains the sourced timeline and fictional narrator. Generator and Community Coming Soon copy/promises, section structure, CSS, links, accessibility and token logic remain intact. No article or historical claim was added.

The updated browser test failed on the absent fiction label before the page changed. The first full unit run then had two obsolete expectations for the previous copy (61 passing, two failing); those expectations were updated for the requested lore and passed. No token/security behavior test was removed. Desktop and phone screenshots were inspected: the fiction label and disclaimer are readable, headings reflow, and the existing section layout remains intact.

Ruling: “Do not mention the token unless live” applies to the rewritten lore; preserve the existing state-dependent token section as the owner also explicitly requested. No token mention was added to the lore and the not_launched section remains unchanged. Cost if this interpretation is wrong: hiding the existing prelaunch token section would require a separate behavior change.

Final checks: `npm run lint`, `npm run typecheck`, `npm run content:validate`, `npm run build` PASS; `npm run test:unit` 63/63, `npm run test:integration` 30/30, `npm run test:security` 66/66, `npm run test:e2e` 31/31 and `npm run test:a11y` 11/11 PASS. `npm run release:check` remains exit 1 with 20 expected blockers. Logs are in the sibling handoff `.build-evidence/maintenance-2026-09-30/task3/` directory. `docs/PERFORMANCE.md` was regenerated only by the browser suite. Existing approval records remain untouched; the new About copy needs owner/editorial re-approval before public launch.
