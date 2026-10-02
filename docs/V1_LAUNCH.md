# BONG v1 launch

## What is shipping

The current site is the product baseline: 1,000 canned ideas with persistent local draws, copy/share and canonical pages; the seven sourced scrolling Through Time events; About/lore; $BONG in its existing `not_launched` state; official X/Telegram links; and Community Coming Soon. It supports desktop/mobile, keyboard navigation and reduced motion. There is no public Contact page or email requirement; the old URL redirects to Community.

Accounts, forums, uploads, moderation, private lifecycle/staff tools, database/Auth/email/CAPTCHA/storage services, wallets, trading and live AI are outside v1. Preserve their dormant boundaries. No extra timeline event or long-form article is needed.

## Engineering readiness

On Node 24.19.0, install with `npm ci` and `npx playwright install chromium` (CI also installs browser OS dependencies). Stop any server on port 3210, then run `npm run release:check`.

The command actually runs all 11 checks: lint, typecheck, content:validate, test:unit, test:integration, test:security, build, security:scan, security:audit, test:e2e and test:a11y. A failed command stays failed; a failed build prevents checking stale browser bundles. Logs and a fresh summary go to ignored `.runtime/release-check/`. GitHub CI runs the same command after a clean install. Local SQL-policy tests use PGlite and need no hosted database.

The source CSV and all 1,000 exact IDs/texts must validate. Generator persistence, source-backed events, draft exclusion, route/API/CLI denial, private-service independence, CSP/headers, reduced motion and automated accessibility remain tested. The existing dependency audit blocks high/critical findings. See [performance notes](PERFORMANCE.md) for the retained lab checks; the abandoned 50 ms target is not a launch requirement.

No approval JSON, acceptance spreadsheet, ASVS matrix, support email or candidate hash is needed for v1 engineering verification. Passing does not represent legal review, rights confirmation, manual accessibility review or independent security certification.

## Human launch checklist — decisions, not failed software tests

- [ ] Use the site on your own desktop and phone; decide whether the visuals, copy, motion and response feel ready. Automated accessibility checks do not replace manual use with assistive technology. Decide whether additional accessibility, performance or independent security review is needed; none is claimed complete here.
- [ ] Confirm permission to publish the supplied artwork and idea collection, and that the configured X/Telegram accounts are yours. Keep the token unlaunched until real information is supplied.
- [ ] Read the terms, privacy and accessibility notices and decide whether legal review or revisions are needed. **One specific policy TODO:** approve or revise [the Accessibility draft](../content/previews/legal/accessibility.json), which removes the obsolete Contact-page promise. The current published JSON still contains that promise. Do not promote this draft or invent its reviewer/date; update those only after genuine approval. Other policy drafts are optional alternatives, not engineering blockers.
- [ ] Confirm the final canonical domain and explicitly decide to publish/index the site. Hosting account access/recovery and a private operational reporting route are sensible recommendations, not a requirement to add public contacts.

## Hosting and intentional launch

The existing Git-connected Netlify site is [bongrippin.netlify.app](https://bongrippin.netlify.app/), built from main with `npm run build`. The committed production context currently sets `APP_ENV=staging`, so public responses remain noindex/nofollow. `APP_ORIGIN` is currently configured as `https://bongrippin.com`; confirm that it is the intended, correctly connected canonical domain before indexing. No hosting setting is changed by this cleanup.

When the owner intentionally chooses to launch:

1. Set the intended production environment to `APP_ENV=production` and `APP_ORIGIN=https://<confirmed-domain>`. Update the production context in `netlify.toml` and any actual host overrides deliberately. Leave `COMMUNITY_ENABLED`, `REGISTRATIONS_ENABLED`, `POSTING_ENABLED` and `UPLOADS_ENABLED` false.
2. Run `npm run release:check:production` with those environment values. This validates the supplied HTTPS origin and safe configuration, then runs engineering tests in an isolated staging context. It does not read/change Netlify, prove DNS ownership, or deploy. A plain local run does not claim production configuration was checked.
3. Only after authorization, push/deploy. Verify the served canonical URLs, HTTPS, production security headers and intended robots behavior, then use the live generator and timeline. Keep the prior successful deploy available for rollback.

Do not provision private providers for v1, place owner/migration credentials in application environments, remove security boundaries, or infer permission to deploy from green checks. Optional security.txt stays absent without a real configured security contact. [Future Community-v2 notes](future-community-v2/README.md) are separate.
