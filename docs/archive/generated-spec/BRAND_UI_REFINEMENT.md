# Focused BONG v1 brand/UI refinement

The later owner-directed [copy edit](COPY_EDIT.md) supersedes this pass's wording where specified and records its own checks. This report remains the historical record of the visual refinement.

Completed locally on 2026-09-27 against Git baseline `6f9a439c10226a7f28b7f2dd865d2c703ef91503`. This is a presentation and copy follow-up to the public v1 scope, not a new release approval. Nothing was deployed, provisioned, committed or pushed during this pass.

## Visual changes

- Kept the cream, ink, orange and pale blue palette, supplied glass-bong artwork, headline, typography and orange divider. Removed the arbitrary wordmark asterisk, floating stars and circular artwork stamp.
- Made the generator the main interaction: stronger CTA, visible artwork focus/hover cues, larger idea text, quiet category/ID metadata, and a ruled paper-style result. Artwork, primary button and result-level “Another one” share the existing guarded deck operation.
- Added a 350 ms decorative bubble response and 300 ms result reveal. Results remain immediate; reduced-motion settings suppress the animation. No dependency was added.
- Replaced the lower-home card treatment with two editorial destinations. Refined the timeline into a dated archive with explicit fiction/history sections, the Community teaser into an intentional artwork composition, and About into five numbered sections.
- Hid timeline search until at least 12 entries are published; queries do not filter the smaller collection. Zero real entries currently exist, so the quiet empty state is shown. No articles or sources were invented.

## Copy changes

The main headline is unchanged. The initial action is “Give me a highdea”, followed by “Another one”. Supporting copy includes “One bong. A thousand unexpected thoughts”, “No prompt. No account. Just a thought”, and “BONG claims credit. We check the receipts.” The footer now reads “1,000 curated highdeas. Curiosity encouraged.”

About separates fictional lore, the fixed generator, sourced history, the future community and factual $BONG information. AI-origin transparency remains in a quiet About note; it is no longer homepage/footer marketing. Missing social links produce a short message, not invented links or dead buttons. The existing prelaunch token state is retained.

## Pages and components

- Public routes: `/`, `/idea/[ideaId]`, `/through-time`, `/through-time/[slug]`, `/community`, `/about`.
- Shared components: Header, Footer, Generator and IdeaActions.
- Styles: existing global stylesheet plus scoped timeline and story-page styles.
- Verification: targeted public unit tests, browser selectors and interaction checks, mobile generated-result accessibility, and screenshot capture. Implementation plan and performance evidence were updated.

All 1,000 IDs and exact idea texts, the source CSV bytes, emitted corpus, supplied assets, dependencies, server implementation, default-off switch and security boundaries are unchanged. All dormant v2 work remains present.

## Screenshot review

Fresh production screenshots cover five states at 1440, 1024, 768 and 390 px: 20 images total. Screenshots use reduced motion and wait for fonts. Desktop/mobile views were inspected, with tablet/laptop spot checks. One correction pass fixed mobile/tablet headline wrapping, restored tablet lower-home spacing, tightened Community's mobile top spacing and removed a redundant hero annotation. The corrected build was recaptured and inspected; no horizontal overflow was found.

| State | Desktop 1440 px | Mobile 390 px |
|---|---|---|
| Home, before generation | [Desktop](../../bong_codex_handoff/.build-evidence/brand-ui/screenshots/home-pre-result-1440.png) | [Mobile](../../bong_codex_handoff/.build-evidence/brand-ui/screenshots/home-pre-result-390.png) |
| Home, generated result | [Desktop](../../bong_codex_handoff/.build-evidence/brand-ui/screenshots/home-result-1440.png) | [Mobile](../../bong_codex_handoff/.build-evidence/brand-ui/screenshots/home-result-390.png) |
| Through Time | [Desktop](../../bong_codex_handoff/.build-evidence/brand-ui/screenshots/through-time-1440.png) | [Mobile](../../bong_codex_handoff/.build-evidence/brand-ui/screenshots/through-time-390.png) |
| Community | [Desktop](../../bong_codex_handoff/.build-evidence/brand-ui/screenshots/community-1440.png) | [Mobile](../../bong_codex_handoff/.build-evidence/brand-ui/screenshots/community-390.png) |
| About / $BONG | [Desktop](../../bong_codex_handoff/.build-evidence/brand-ui/screenshots/about-1440.png) | [Mobile](../../bong_codex_handoff/.build-evidence/brand-ui/screenshots/about-390.png) |

Raw screenshots and logs stay in the sibling handoff evidence folder, outside the application. The first visual pass is preserved in `screenshots-first-pass`. These local links require that folder; screenshots are not bundled into the application.

## Exact verification

Final production build: `4g9BScwBqDMUPL3f2Xz48`. Source candidate SHA-256: `2dd87dff6c848831cefd3ba031a143e8bdf2bb66f0fe8327487e72a6b0c86a94`. [brand-ui-evidence.json](brand-ui-evidence.json) binds the scoped checks, logs and screenshots to this candidate.

| Command/check | Observed result |
|---|---|
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `npm run content:validate` | PASS, exit 0; exact 1,000 ideas / 22 categories |
| Targeted Vitest command below | 32/32 PASS across 5 files, exit 0 |
| `npm run build` | PASS, exit 0 |
| `npm run test:e2e` | 25/25 PASS, exit 0 |
| `npm run test:a11y` | 11/11 PASS, exit 0; no axe violations |
| `git diff --check` | PASS, exit 0 |
| `npm run release:check` | BLOCKED, exit 1; 23 findings described below |

```text
npx vitest run tests/unit/content.test.ts tests/unit/deck.test.ts tests/unit/timeline.test.ts tests/unit/community-page.test.ts tests/unit/timeline-presentation.test.ts
```

Browser checks include artwork click, Enter, Space, result-level regeneration, shared deck/persistence, storage/failure recovery, copy/share, reduced motion, nonce behavior, default-off private routes/APIs, absence of provider requests, screenshots and performance. The content tests retain the CSV Git-checkout/integrity regression. Independent agent review found no actionable issue. Deferred community integration/security/provider suites were not rerun because their implementation and boundaries were untouched.

Source CSV SHA-256 remains `d47f279eb2cce77a5730e9dbb7ab156bd5675787e18e926cd5434b20ebe8baf9`; public corpus hash remains `f97d063e6cc814db55ca6c551ebf372b5ce38ccf8ab56878c7d961bc81526111`.

The six-run local production homepage lab measured median LCP of 236 ms desktop / 788 ms throttled mobile, CLS 0.0027 / 0.0007, and median draw-to-DOM time of 13.9 / 20.7 ms. Conditions and limits are in [PERFORMANCE.md](PERFORMANCE.md). These are local lab measurements, not hosted load or field performance evidence. The previous performance raw record and report are preserved as `performance-before-refinement.json` and `.md` in this pass's evidence folder.

## Unresolved items and owner inputs

No failed public UI functional check remains. Manual accessibility, physical-device and owner visual acceptance are still open. The future populated timeline is covered with isolated test fixtures, but cannot receive final real-content visual review until approved articles exist.

The release check correctly remains blocked. Twenty findings were already present: genuine reviewed articles; monitored support/security contacts; approved terms/privacy/accessibility content; visual, artwork-rights, idea-editorial, legal, independent-security, manual-accessibility, load/performance, production-authority, hosting and deployment reviews; verified production environment/origin and `APP_ORIGIN`; 59 unresolved public acceptance scenarios; and 114 ASVS controls awaiting independent assessment or approved exclusions. The other three findings identify the previous full-release evidence, acceptance and ASVS records as belonging to the earlier source candidate. This scoped UI evidence does not rebind or claim to replace that broader evidence. Release checks and their requirements were not weakened.

The owner still needs to supply at least eight genuine reviewed timeline articles under the existing launch gate, approved public contacts/legal content, rights/editorial approvals and the outstanding public hosting/reviewer/production approvals. Supply verified X and Telegram URLs when available. Supply verified token details only when applicable; the site currently retains its prelaunch state. Private database, authentication, email, CAPTCHA, uploads, moderation and account lifecycle infrastructure remain deferred to community v2.
