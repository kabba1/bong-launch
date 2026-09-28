# V1 copy and policy refinement

Completed locally on 2026-09-28 (America/Chicago). This pass applies the owner's page-by-page decisions to the existing public v1 site. It does not enable accounts, the forum, moderation, database, Auth, email, CAPTCHA, uploads, wallets or trading. The retained community implementation remains default-off for a future release.

## Result

- Home now opens with the headline, supplied bong artwork and one **Give me an idea** button. The repeated tagline, instructions, caption, empty result card, curiosity strip and visible Recent ideas were removed. A result shows only the exact idea plus **Copy idea** and **Share**; the primary control becomes **Another idea**. Deck persistence, unique draws, storage fallback, hidden verification ID, live announcement and truthful load failure remain.
- Through Time now uses **The unofficial record** and **Some ideas made history.** Its real-entry fact/fiction labels, sources, metadata and search threshold are unchanged.
- Community now contains the Coming Soon heading, one sentence and the configured official [X](https://x.com/rippinmybong) and [Telegram](https://t.me/bongrippin) destinations. Its old artwork and unrelated internal calls to action were removed.
- About now carries the integrated origin story, direct generator/timeline descriptions and concise prelaunch `$BONG` notice. The verified live-token branch still requires a safe official URL and preserves its exact network, address, disclosure, verification, risk and no-wallet text.
- Privacy, Terms and Accessibility now publish concise owner-approved v1 notices. They describe browser generator storage, possible host logs, disabled public accounts/submissions, third-party social links, token caution and the site's accessibility approach. No operator identity, monitored contact, jurisdiction or legal-review claim was invented.
- The future-community Home result still exposes **Discuss this** only when `COMMUNITY_ENABLED=true`; public v1 remains copy/share-only.

## Verification

Production build ID: `POWX-lcGDl1cHlfrCfBAk`.

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run content:validate` | PASS; 1,000 exact rows, 22 categories, unchanged corpus hash `f97d063e6cc814db55ca6c551ebf372b5ce38ccf8ab56878c7d961bc81526111` |
| `npm run test:unit` | 58 / 58 PASS |
| `npm run test:integration` | 30 / 30 PASS |
| `npm run test:security` | 60 / 60 PASS |
| `npm run build` | PASS |
| `npm run test:e2e` | 28 / 28 PASS on the final full run |
| `npm run test:a11y` | 11 / 11 PASS; no axe violations |
| Future-community Home regression | 1 / 1 PASS with explicit opt-in |
| `npm audit --omit=dev --audit-level=high` | PASS; zero reported vulnerabilities |
| `npm run security:scan` | PASS |
| `git diff --check` | PASS |

The first full browser run found that removing the empty result card delayed the Space Grotesk 500 font request until the first draw. The idea text now uses the already-loaded 600 face and the unused 500 import is gone; all six final performance samples recorded zero draw requests.

One isolated throttled-mobile performance run then exceeded the unchanged 50 ms click-to-DOM target with a 114.3 ms outlier. Its other two run maxima were 39.1 ms and 33.3 ms. An identical repeat passed at 38.4 ms worst, and the final full-suite run passed at 49.6 ms worst. No threshold was relaxed. Raw failed and passing records remain in the sibling `.build-evidence/performance-history` directory. This local variability remains a genuine observation and does not substitute for hosted or real-device performance review.

Screenshots at 1440, 1024, 768 and 390 px cover Home before/after generation, Through Time, Community and About. The simplified layouts reflow without horizontal overflow. Automated axe and browser emulation do not replace manual accessibility or physical-device review.

## Release status

`npm run release:check` remains nonzero with 20 genuine blockers. The previously missing terms, privacy and accessibility content is now present, but public v1 still needs:

- at least eight genuine reviewed timeline articles;
- monitored support and security contacts;
- real visual, artwork-rights, idea-editorial, legal, independent-security, manual-accessibility, load/performance, production-authorization, public-hosting and public-deployment evidence;
- a verified production environment and canonical HTTPS `APP_ORIGIN`;
- closure of 59 public acceptance scenarios and independent assessment or approved exclusion for 114 public ASVS controls; and
- final acceptance, ASVS and automated evidence bound to the exact release candidate.

Database/Auth/email/CAPTCHA/staff/private-storage/restore configuration and community moderation operations remain deferred v2 requirements. No production deployment, DNS change or paid provisioning occurred in this pass.
