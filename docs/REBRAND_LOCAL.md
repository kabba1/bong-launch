# Aqua rebrand — 2026-10-01

The owner supplied `bong-claude-rebrand.zip` and requested its visual direction with implementation mistakes polished. The rebrand was developed and reviewed locally, including the owner-selected scrolling timeline, reduced bubble count, cursor repulsion on large bubbles, and natural cursor-trail motion. On 2026-10-01 the owner explicitly requested pushing this version to GitHub and Netlify, superseding the earlier local-only restriction. Publish to the existing repository and Netlify site without changing DNS, hosted configuration or dormant community features.

## Design and scope

- Foam, aqua, deep blue and yellow replace the previous cream/orange palette. Bricolage Grotesque display type, rounded controls, dark outlines, oversized destinations and footer follow the reference.
- Preserve the existing 1,000 exact ideas, persistent deck, cross-tab behavior, canonical links, copy/share and failure handling. The ZIP's 24 placeholder ideas are not application content.
- Use the supplied transparent artwork and the seven existing source-backed historical events. Present timeline events as full-height scrollable scenes with direct navigation, keyboard access, reduced-motion support and ordinary readable HTML.
- Keep the established About story and official social/token state. Keep legal routes and accessible mobile navigation, which the prototype omits. Community and private backend features remain disabled.
- Bubble motion is decorative, bounded, pausable, and stops off screen or in a background tab. Reduced motion disables it. The owner explicitly preferred the original canvas motion and cursor trail over the CSS experiment: retain that motion with eight larger ambient bubbles on desktop, five on mobile, and a four-bubble generator burst. Restore the reference's cursor repulsion and click-to-pop interaction: each popped ambient bubble releases eight fading fragments and re-enters below the hero. Per the owner's follow-up, cursor-trail bubbles drift naturally without repulsion. Cursor tracking clears on leave, blur, scroll and resize. Generator results remain readable and controls reachable on small screens.

## Dependency and asset changes

Add exactly `@fontsource/bricolage-grotesque@5.3.0`, served locally with the existing DM Sans weights through `next/font/local`. Preload the weights used by generated results so drawing an idea does not fetch a font. The supplied transparent assets are copied as `public/images/bong-rebrand-500.webp` and `bong-rebrand-900.webp`. No external font requests, live AI, new data service or analytics integration.

## Verification plan

- GEN-01–15 / DATA-01–09: exact corpus validation, generator/persistence/copy/share regressions.
- TIME-01/04/05/07/08: all sourced events, natural scrolling, direct event navigation, keyboard and no-JavaScript access.
- UX-01/02/04/05/07/08: visual comparison at desktop and phone sizes, no horizontal overflow, clear focus, motion preference, accessibility scans.
- SEC / V1 boundaries: retain security and real database-policy regressions; no private-service requests on public routes.
- OPS-05: production build and browser checks, then verify the GitHub commit and matching Netlify deployment under the owner's explicit publication request. Record actual outcomes and unresolved findings.

## Verification record

- Publication verification: fresh lint, TypeScript, exact corpus validation and secret scan pass. All 77 unit, 30 integration, 68 security, 45 functional/visual browser and 11 accessibility checks pass. The local production build passed after the final cursor-trail correction; Netlify must rebuild the pushed commit before the hosted update is considered complete. The strict timing benchmark remains explicitly deferred below.
- Cursor-interaction correction: the new browser regression first reproduced the missing response (0.31px natural drift instead of the required cursor response), then passed after restoring repulsion and popping. All three focused rebrand browser checks, lint, TypeScript and a fresh production build pass. This follow-up maps to UX-04/05/07 and OPS-05; broader results below are from the preceding rebrand verification.
- Lint, TypeScript, exact corpus validation and the production build pass. All 1,000 idea pages and their 1,000 share images are prerendered.
- 77 unit, 30 integration and 68 security checks pass, including the existing database-policy negative cases.
- 44 functional/visual browser checks and all 11 accessibility scans pass. Coverage includes keyboard, touch, 320px reflow, short landscape screens, 200% text, reduced motion and history without JavaScript.
- Desktop, tablet and phone screenshots are saved under `../bong_codex_handoff/.build-evidence/rebrand/screenshots`. The longest idea's share image was visually inspected and fits its 1200 × 630 canvas.
- Visual review found light text over the pale end of the homepage gradient. The gradient now reaches a dark blue before the text starts, with a minimum 5.77:1 contrast for its normal text.
- Review found doubled header clearance on timeline navigation. It is fixed and covered at 568 × 320 and 1280 × 320. The enlarged-text test initially failed because its injected stylesheet was correctly blocked by production CSP; it now uses CSSOM, confirms 32px text and passes without a policy change.
- Performance testing found first-draw font downloads and scroll-triggered route prefetch. Local font weights are now preloaded, and automatic prefetch is disabled on homepage and shared navigation links. The deck still uses one validated corpus and local draws; cross-tab locking and persistence are preserved.
- The owner explicitly deprioritized the mobile response-time target and requested restoration of the original bubble behavior. The strict 50ms lab target was not met consistently in the optimization experiments and is not marked passed. The final canvas version is verified for functionality, motion controls and accessibility; no further timing run or timing-driven visual changes are part of this handoff. The original performance test and its threshold remain intact. See the historical measurement note in `PERFORMANCE.md`.
- `release:check` still exits 1 on 19 inherited contact, reviewer, production-configuration and evidence gates. No contact section was added and no approval records were fabricated. The owner explicitly authorized updating the existing Netlify site; its staging/noindex configuration remains in place. These existing public-launch records have not been relabeled as satisfied.
