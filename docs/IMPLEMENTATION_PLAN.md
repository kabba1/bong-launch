# Public v1 repository cleanup

The current implementation on `main` is the product baseline. The owner's cleanup request replaces the generated specification as the definition of this task. Changes stay local: no commit/push, deployment, infrastructure, DNS or Netlify configuration change.

## Plan and verification

- [x] Replace v1's evidence-reading release gate with fresh engineering checks, plus explicit production configuration validation. Keep failure propagation, exact content validation, audit, secret scan and private-boundary tests (DATA, GEN, SEC, OPS).
- [x] Isolate the legacy Community-v2 gate and preserve its historical records. Archive superseded v1 matrices, reports and plans without marking them passed.
- [x] Make README and `V1_LAUNCH.md` the current owner-facing documentation. Update agent instructions, content/asset references and CI to agree with the seven-event public site.
- [x] Retire the abandoned 50 ms assertion while retaining lab measurements, a generous stall guard, resource budgets and one-corpus/zero-network-draw checks. Store generated results under ignored `.runtime/`, not in tracked documentation (GEN, UX, OPS).
- [x] Preserve policy approval metadata and development-only drafts. Put the Accessibility Contact-page correction in one explicit human TODO. Treat optional, unconfigured security.txt as absent rather than a launch failure.
- [x] Run lint, types, exact content validation, unit/integration/security, build, secret scan, dependency audit, all browser/a11y tests and the new release command. Check production-origin negative cases and unchanged Netlify settings.

## Decisions

- V1's empty `approvals`/`contacts` fields are retained for schema compatibility, but are not engineering gates. Human decisions live in the short launch checklist.
- The existing legal-content schema still requires real approval metadata. Draft notices remain drafts; no reviewer, date or approval is invented.
- Public v1 tests run in an isolated staging environment. Production mode additionally inspects the supplied production configuration; it does not enable indexing or publish anything.
- Archived generated-spec records are historical input, not instructions or current evidence. Existing acceptance IDs in useful tests are retained as labels, without mandatory matrices.

## Completed verification

The cleanup passed a clean `npm ci` and all 11 checks through `npm run release:check` on the local Node 24.19.0 installation. Unit tests also exercise the actual release CLI's production-configuration rejection, safe-origin negative cases and failure propagation.

| Check | Result |
|---|---|
| lint, typecheck | PASS |
| content:validate | PASS: 1,000 exact source rows, 22 categories, 1,000 active ideas, seven public timeline events |
| test:unit | 82 passed |
| test:integration | 30 passed |
| test:security | 68 passed |
| build | PASS |
| security:scan | PASS |
| security:audit | PASS: zero vulnerabilities |
| test:e2e | 46 passed, including the six-sample performance regression check |
| test:a11y | 11 passed |
| release:check | PASS: all 11 engineering checks |

The final review removed archived JSON from Community validator unit-test inputs and shortened the CSV integrity document. Lint, types and all 82 unit tests passed again after that change. Earlier runner compatibility/type failures were fixed and verified; their logs remain under ignored `.runtime/release-check-initial/`. Fresh check logs are in `.runtime/release-check/`, with final review reruns in `.runtime/cleanup-final-*.log`.

All seven archived evidence JSON records retain their original data. Published content, policy metadata, application UI, the idea corpus and `netlify.toml` remain unchanged. Optional security.txt now returns 404 when no security contact exists; configured-contact behavior is covered separately. The future Community release command remains incomplete, as expected, and does not gate v1.

No hosted GitHub CI run, final-host configuration verification, human approval, commit, push or deployment is claimed. The remaining decisions are only those in [V1_LAUNCH.md](V1_LAUNCH.md).
