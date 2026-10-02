# Future Community v2 — dormant

Accounts, Auth/email/CAPTCHA, posts/comments, uploads, moderation, staff, private storage and account lifecycle tooling remain implemented but disabled. None is a public-v1 launch requirement. Do not enable or provision it during v1 repository maintenance.

[API.md](API.md), [SETUP.md](SETUP.md) and [RUNBOOKS.md](RUNBOOKS.md) preserve technical implementation and operating notes for that future work. Their private-provider instructions apply only to a separately authorized Community environment. Public-v1 instructions live in [V1_LAUNCH.md](../V1_LAUNCH.md).

`npm run release:check:community` runs the retained generated-spec framework in `scripts/community/`. It explicitly selects Community scope and inspects the original full acceptance/ASVS records and pre-v1 report in `docs/archive/generated-spec/`. It is expected to remain incomplete. Those archived records are not current approvals; revisiting Community requires its own real provider, database, staff, media and lifecycle verification. V1 evidence must never stand in for that work.

The normal unit, integration and security suites still exercise SQL policies, restricted roles, CSRF, authorization, shared limits, MFA, sanitized private media, lifecycle races, and dormant route/API/CLI denial. These protections have not been removed with the paperwork.
