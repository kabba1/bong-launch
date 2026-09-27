# BONG application

Project requirements and verification are recorded in the [implementation plan](docs/IMPLEMENTATION_PLAN.md), [acceptance matrix](docs/acceptance-evidence.json), [release report](docs/RELEASE_REPORT.md), and [runbooks](docs/RUNBOOKS.md). These files are kept with the application so a checkout is self-contained.

Follow [the implementation plan](docs/IMPLEMENTATION_PLAN.md). Preserve all 1,000 exact source IDs/texts. No live AI, wallets, invented articles, activity, staff or token identifiers. Public content is backend-independent. All private data uses the server-only BFF, dedicated restricted SQL role, transaction-local verified actor and RLS. Do not add alternate provider write paths. All browser writes require strict origin, CSRF and shared limits. Uploaded raster derivatives stay private with authorized delivery. Staff need approved-factor MFA. Never add secrets or weaken failing checks. No production provisioning/deployment without explicit owner authority.

Required checks: `npm run lint`, `npm run typecheck`, `npm run content:validate`, `npm run test:unit`, `npm run test:integration`, `npm run test:security`, `npm run test:e2e`, `npm run test:a11y`, `npm run build`, `npm run release:check`. Record failures and unverified staging/manual requirements honestly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
