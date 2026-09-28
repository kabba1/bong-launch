# Asset and rights inventory

| Asset | Origin / treatment | Rights status |
|---|---|---|
| `assets/bong-logo.png` | Owner-supplied replacement `bong.png` (2026-09-28), 1254 × 1254; original bytes and transparency preserved | Owner permission/rights confirmation required before public launch |
| `public/images/bong-{480,800,1254}.webp` | Reproducible sharp resize/encoding of replacement illustration; composition and transparency preserved | Same owner gate as source |
| `src/app/icon.svg` | Simple B wordmark on the supplied palette, written for this implementation | No unrelated third-party icon/artwork used |
| Space Grotesk | Self-hosted `@fontsource/space-grotesk` 5.3.0, weights 500/600/700 | SIL OFL-1.1; full license retained in `docs/licenses/` and dependency distribution |
| DM Sans | Self-hosted `@fontsource/dm-sans` 5.3.0, weights 400/500/600 | SIL OFL-1.1; full license retained in `docs/licenses/` and dependency distribution |
| Idea corpus | Exact supplied 1,000 canned, AI-origin ideas | Final owner editorial/rights approval required; no originality claim |
| Historical imagery/articles | None supplied/published | Any future image requires provenance, rights and review metadata |

No claim is made that the supplied illustration or ideas are human-created, original, licensed in a particular way, or factually safe merely because they validate structurally. Icons are small in-source line shapes. No stock assets, generated historical scenes, fake portraits or testimonials were added.

The replacement source SHA-256 is `6258878bd7038e8b3740d46bff1f28cc9bd1ef554c4086c9519ba2a64a788f15`. The homepage and Community use its first 12 hash characters as an image URL version query so existing immutable image caches do not retain the placeholder. Run `npm run assets:build` to reproduce the optimized variants. Their respective file sizes are 22,524, 47,214 and 88,684 bytes at 480, 800 and 1254 px. No background was flattened into the replacement; the existing page frame supplies its own background.

Replacement verification (2026-09-28): source byte equality, alpha preservation, lint, typecheck, content validation and production build passed (build `11EbslDxldGQalSTH1YxG`). The targeted Playwright run passed nine public browser checks and eleven axe checks. Additional desktop/mobile checks confirmed that displayed images use the new version URL, served bytes match the optimized files, clicking the artwork still generates an idea, and no overflow or browser errors occur. Homepage and Community screenshots at 1440 and 390 px were inspected; evidence is in the sibling handoff `.build-evidence/artwork-replacement` folder. No style/layout, corpus, dependency, backend or release-policy change was made. No commit, push or deployment occurred during the replacement.

