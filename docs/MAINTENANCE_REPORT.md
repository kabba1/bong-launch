# Owner-requested maintenance — 2026-09-30

This report tracks the four requested tasks, their separate commits and actual checks. It supplements historical release evidence without rebinding or inventing approvals. Public launch remains blocked; the existing Netlify site stays noindex.

## Task 1 — Local user path

Changed `docs/RELEASE_REPORT.md` to refer to the repository as `.`. The repository source scan found that single local user path. Added `tests/unit/local-paths.test.ts`, automatically included by `npm run test:unit`, to scan every file in `docs/`, `content/` and `src/`. It detects Windows slash/backslash and Unix user paths and reports only relative filenames. No generated files were edited.

Regression check: `npm run test:unit -- tests/unit/local-paths.test.ts` ran the full unit suite and failed exactly at the existing release-report leak (59 passing, one failing test), before the documentation correction.

Final checks: `npm run lint`, `npm run typecheck`, `npm run content:validate`, `npm run build` PASS; `npm run test:unit` 60/60, `npm run test:integration` 30/30, `npm run test:security` 60/60, `npm run test:e2e` 28/28, `npm run test:a11y` 11/11 PASS. Browser output includes the runner's existing NO_COLOR/FORCE_COLOR warning. Logs are in the sibling handoff `.build-evidence/maintenance-2026-09-30/task1/` directory. All source IDs/texts and the corpus hash are unchanged.

The full scan including ignored files also found paths in 65 `.next` and nine `.netlify` build/trace artifacts. These are framework-generated, ignored local output, so they were not hand-edited. The committed source scan is clean. Initial lint failed with 325 errors and 6,326 warnings because ESLint traversed existing `.netlify` compiled output; `eslint.config.mjs` now ignores that generated directory alongside `.next`. Application lint rules and tests are unchanged.

## Remaining work

Tasks 2–4 and GitHub/Netlify publication are pending. Eight draft timeline files are absent: `content/timeline/` contains only `.gitkeep`. Task 4 will therefore use isolated fixtures, with no editorial content or review records added to the repository.
