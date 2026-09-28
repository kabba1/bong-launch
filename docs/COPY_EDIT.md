# Focused public v1 copy edit

Completed locally on 2026-09-27 (America/Chicago), preserving the existing brand refinement. Applied the owner's exact replacements and deletions to the homepage/generator, lower-home destinations, timeline listing/detail labels, Community, About, footer and page descriptions. Removed the quantity claim from idea permalinks and the tagline from the code-rendered idea share image. Article metadata, selected idea text and share payloads are unchanged.

Removed obsolete text wrappers. The two lower-home destination headings are now semantic h2s, retaining their existing visual styling. The mobile rule that previously hid the final ticker item was removed so the single requested strip sentence remains visible. No fonts, colors, artwork, dependencies, architecture, generator behavior or security boundaries were changed in this pass.

About contains the readable origin explanation, explicit fictional lore label, state-dependent token details, official-contract warning and requested risk/wallet statements. Community preserves configured-only validated social links and remains disabled for v1. No accounts, uploads, providers or live AI were enabled.

## Verification

Build ID: `A_P244S_CSsXhLIpYF0lo`.

Source candidate SHA-256: `b92b74f85f235e53a58ae2d5b912ec9ed8e93f3e84f32220c24e8f7e089683be` (using the existing `scripts/candidate.ts`; documentation is excluded).

| Check | Actual result |
|---|---|
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `npm run content:validate` | PASS, exit 0; all 1,000 exact source rows, IDs/categories and existing corpus hash preserved |
| Targeted public/content Vitest command below | 33/33 PASS, 5 files, exit 0 |
| `npm run build` | PASS, exit 0 |
| `npm run test:e2e` | 25 PASS, 1 performance test FAIL; exit 1 |
| Isolated unchanged performance-test repeat | 1/1 PASS, exit 0 |
| `npm run test:a11y` | 11/11 PASS, exit 0; no axe violations |
| Idea share-image request | HTTP 200, image/png; rendered image inspected |
| `git diff --check` | PASS |

```text
npx vitest run tests/unit/content.test.ts tests/unit/deck.test.ts tests/unit/timeline.test.ts tests/unit/community-page.test.ts tests/unit/timeline-presentation.test.ts
npx playwright test tests/e2e/performance.spec.ts --project=chromium --output=../bong_codex_handoff/.build-evidence/copy-edit/performance-repeat-artifacts
```

The browser checks verify exact page descriptions and requested copy, absence of quantity marketing/repeated slogans, one homepage-strip placement, functional generation/copy/share/storage/keyboard controls, preserved warnings, and no public account links or provider requests. Private routes still redirect to Coming Soon and private APIs return `COMMUNITY_DISABLED`. Timeline search remains absent below 12 published entries; factual content/source links and article metadata remain intact.

**Observed performance miss:** the first full browser run measured a 77.7 ms worst mobile click-to-DOM commit against the unchanged 50 ms limit. Two mobile draws exceeded that limit (77.7 and 56.4 ms), both in the first mobile sample. No draw network requests or observer errors occurred. One isolated repeat of the same build and unchanged test passed, with a 34.4 ms worst mobile draw. No performance fix was made; the initial failure and timing variability remain recorded, not relabeled as a pass. This does not prevent any requested copy replacement. The existing hosted/manual performance approval remains open.

Raw logs, first-run performance data/report/trace, repeat results and screenshots are preserved in [the local copy-edit evidence folder](../../bong_codex_handoff/.build-evidence/copy-edit). [PERFORMANCE.md](PERFORMANCE.md) shows the repeat's measurements and lab limitations. The prior refinement's raw performance data/report were also saved before this run.

## Visual and asset inspection

Captured 20 screenshots using the existing script (five states at 1440, 1024, 768 and 390 px). Inspected home before/after generation, Through Time, Community and About at desktop/mobile sizes once. No deletion-related spacing, heading or overflow issue required further changes. Screenshots are local evidence, outside the application:

| State | Desktop | Mobile |
|---|---|---|
| Home, before result | [1440 px](../../bong_codex_handoff/.build-evidence/copy-edit/screenshots/home-pre-result-1440.png) | [390 px](../../bong_codex_handoff/.build-evidence/copy-edit/screenshots/home-pre-result-390.png) |
| Home, result | [1440 px](../../bong_codex_handoff/.build-evidence/copy-edit/screenshots/home-result-1440.png) | [390 px](../../bong_codex_handoff/.build-evidence/copy-edit/screenshots/home-result-390.png) |
| Through Time | [1440 px](../../bong_codex_handoff/.build-evidence/copy-edit/screenshots/through-time-1440.png) | [390 px](../../bong_codex_handoff/.build-evidence/copy-edit/screenshots/through-time-390.png) |
| Community | [1440 px](../../bong_codex_handoff/.build-evidence/copy-edit/screenshots/community-1440.png) | [390 px](../../bong_codex_handoff/.build-evidence/copy-edit/screenshots/community-390.png) |
| About | [1440 px](../../bong_codex_handoff/.build-evidence/copy-edit/screenshots/about-1440.png) | [390 px](../../bong_codex_handoff/.build-evidence/copy-edit/screenshots/about-390.png) |

No unwanted wording was found baked into the supplied `assets/bong-logo.png` artwork or its inspected rendered variants. The SVG icon is only a letterform. No image was regenerated or cropped. The [rendered share card](../../bong_codex_handoff/.build-evidence/copy-edit/idea-share-card.png) has the original idea/ID and no removed tagline.

## Scope and limitations

No concrete blocker prevented an instructed copy change. Exact CSV integrity remains preserved: source SHA-256 `d47f279eb2cce77a5730e9dbb7ab156bd5675787e18e926cd5434b20ebe8baf9`, public corpus hash `f97d063e6cc814db55ca6c551ebf372b5ce38ccf8ab56878c7d961bc81526111`. Content, artwork, dependencies, backend and release-policy diffs remain empty relative to Git HEAD.

This is scoped public-copy verification, not a new full-release assessment. Existing owner/content/hosting/security/manual-accessibility approvals remain open, and older release/acceptance/ASVS records still identify their earlier candidates. Dormant v2 suites were not rerun. No deployment, DNS change, paid provisioning, commit or push occurred. The local production preview was restored with community disabled.
