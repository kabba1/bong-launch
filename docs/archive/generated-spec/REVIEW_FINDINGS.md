# Implementation review findings

These are observed implementation/testing findings, not a substitute for the independent security release assessment. Agent code review and local regressions were performed on 2026-09-27. A finding is closed only by the named fixed-path check; full staging requirements remain in the acceptance matrix.

| Finding | Correction | Retest |
|---|---|---|
| PostgreSQL default PUBLIC function EXECUTE could cross privilege boundaries | Explicit existing-function revokes and global future-function default revoke; runtime/maintenance get narrow grants only | `tests/integration/database.test.ts`: owner function denied to runtime/maintenance and SET ROLE/CREATE ROLE forbidden |
| SQL cursor encoding differed from strict API base64url parsing | One URL-safe encoding and decode path | Real PostgreSQL cursor round-trip and `tests/e2e/board-navigation.spec.ts` |
| Rate email cooldown could allow sends across fixed-window boundary | True elapsed 60-second cooldown and HMAC identities | Real PostgreSQL cooldown and quota/idempotency negative tests |
| Crashed final job lease, export/delete race and removed revision assets could leave unfinished cleanup | Exhausted leases fail visibly; deletion wins; durable object compensation and retention cleanup | PostgreSQL ordered race/retry/hold tests; security job ordering tests |
| Header lacked signed-in account navigation | Read session on navigation and expose account link | `tests/e2e/navigation.spec.ts` (UI interception only) |
| Composer showed editing controls for other users/removed states; edit reload lost source | Explicit author/state permission helpers and validated source restoration | `tests/unit/board-author-view.test.ts`, `tests/e2e/author-edit.spec.ts` |
| Author pending/rejected revisions lacked exact submitted preview | Private revision preview includes body/link/source/images and decision state | Author-view rendered-preview tests; API/SQL isolation remains separately verified |
| Storage write failure with a coarse clock could reread a stale cursor | Once storage fails, tab keeps its in-memory deck and ignores storage reconciliation | `tests/e2e/storage-quota.spec.ts` was observed failing before fix; final browser run verifies correction |
| Repeated timeline query parameter was an array | Normalize to bounded string before filtering | Typecheck and public route tests; real article search remains editorial/staging-gated |
| Expired access token could produce false private-post 404 despite valid refresh cookie | Bounded client refresh gate persists cookies through existing session API; RSC never discards refreshed cookies | Page-read and browser tests recorded with final suite |
| Initial browser assertions clicked a disabled reveal button, matched Next's route announcer, and expected only half of an idea as exact text | Wait for real enabled state; scope visible app errors; check actual full source text | Final browser suite |
| Injecting script using browser automation's privileged evaluation gave invalid CSP evidence | Inject nonce-less script into parsed HTML while preserving real response CSP | Production browser CSP test verifies blocking and working app hydration |

Original dependency failures were also repaired: supported TypeScript6 pin and official ESLint compatibility adapter. Clean install, lint and production build are required after those changes. No lint/security rule was disabled to hide a failure.

The first six-run performance check found real `/board/new` prefetch requests during draws. Setting `prefetch={false}` on the Discuss link removes that unnecessary network work. Raw failing samples are preserved as `.build-evidence/performance-before-prefetch-fix.json`; the subsequent production run passed the invariant across 60 measured draws; final samples are retained separately.


Independent final agent review additionally reproduced and corrected (independently retested; final consolidated suites linked in release evidence): nonempty image attachment through disabled environment/SQL upload switches; provider refresh outages becoming 401 and clearing renewable cookies; in-flight upload/account-deletion orphan race. The last uses reservation fencing, narrowly scoped server-only cleanup capability, generation-checked worker acknowledgment and bounded tombstone retention. Negative SQL/API/worker tests cover wrong actor/capability, expired/abandoned leases, stale completion and late compensation after revocation/purge. This automated review remains distinct from required independent human security release assessment.

