# BONG

BONG is a public idea generator and a short, sourced trip through history. V1 contains the existing 1,000 ideas, shareable idea pages and images, seven scrolling timeline events, About/lore, prelaunch $BONG information, and the configured X and Telegram links. Community is Coming Soon.

There are no active accounts, posts, uploads, wallets, trading or live AI. The retained Community-v2 code is disabled and requires no database, email, CAPTCHA or private storage to run v1.

## Run

Use Node **24.19.0** and the committed lockfile:

```sh
npm ci
npm run content:build
npm run dev
```

Open [localhost](http://127.0.0.1:3210). Leave Community and its participation flags false or unset. For a production-build preview, stop the dev server, run `npm run build`, then `npm run start`.

## Verify

```sh
npx playwright install chromium
npm run release:check
```

Stop other servers on port 3210 first. This runs lint, TypeScript, exact content validation, unit/integration/security tests, the production build, secret scan, dependency audit, browser tests and automated accessibility checks. It uses fresh command results, not historical approval files. Logs are in ignored `.runtime/release-check/`. Each check is also an individual package script.

Read the short [v1 launch guide and human checklist](docs/V1_LAUNCH.md). The existing Netlify site is Git-connected but remains staging/noindex. Pushing to main deploys it; do so only when the owner asks to publish. [Historical generated-spec records](docs/archive/generated-spec/README.md) do not define current v1 readiness.
