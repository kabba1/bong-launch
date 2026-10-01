# Editorial and release process

Current release scope is public **v1** as described in [V1_SCOPE.md](V1_SCOPE.md). The community implementation remains disabled and is subject to a separate future release. Do not create a database, SMTP/CAPTCHA service, staff identity or private bucket just to clear a public v1 check.

`content/site.json` holds reviewed public identity/configuration. Token mode starts `not_launched`; never guess an address, network, social account or project URL. Live token mode needs exact owner-verified identifiers, official URL and creator-interest disclosure. Only configured genuine social links render; missing values are omitted. No wallet or transaction capability is included.

The supplied art, visual direction and all 1,000 exact idea texts require owner approval. Use explicit known-ID withdrawals for concerning entries; never silently rewrite the original corpus or reassign an ID. Public active content and its hash are deterministic. SQL catalog generation remains compatible with v2, but no database deployment is needed in v1.

The owner's 2026-10-01 direction removes per-event reviewer records and the eight-entry minimum for public v1. The seven sourced short events in `src/features/timeline/events.ts` (`timelineEvents`) are public content, rendered by `TimelineDock.tsx` on `/through-time` in development and production. Preserve accurate dates, uncertainty, source links and any applicable image rights. Existing long-form article drafts remain drafts; do not invent reviewer identities or fill article fields merely to publish these short events. Long-form articles retain their schema and numeric sortYear ordering.

## Timeline voice — owner clarification, 2026-09-30

Through Time is an educational, scrollable chronology of highlighted moments across human history. Readers should learn accurate facts. The owner subsequently clarified that this changes the explicit introductory copy, not BONG's personality. Retain the established voice; do not characterize BONG as a new “quiet witness” persona. The feeling that BONG was there can remain implicit.

- Research the actual event, explain something worth learning, and credit the real people and work involved. Preserve uncertainty and shared attribution; do not reduce everything to a lone genius or a sudden revelation.
- Write the short narrative part as BONG telling the story, without repeatedly announcing that BONG was there. Use an observant aside or perspective rather than an alternative account of what happened. The existing `fictionText` field holds this fictional narrator's contribution; the sourced factual fields and references remain authoritative.
- Historical entries must never claim or directly imply that BONG, a bong rip, cannabis or drug use caused, inspired, enabled or influenced a historical person, invention, idea or event. Do not invent conversations with real figures or actions by them. The owner separately approved restoring the pyramids/wheel/relativity/Tinder gag in About's visibly fictional Story; this lore exception does not apply to factual timeline entries.
- Where a long-form article includes fictional narration, keep **BONG’s narration · Fiction** distinct from **The history**. Fiction applies to the imagined narrator, not an excuse to distort facts. The seven short events carry factual text and source links without a separate fictional passage.
- Keep the chronology normally scrollable and date-ordered with accessible highlighted entries. Preserve source accuracy and do not invent articles, sources, dates or reviewer records. Public v1 short events do not require a separate approval record.

Public introduction: **Some ideas made history.** About expands this to: “Some ideas made history. Explore the moments that changed how people lived, the problems they were trying to solve, and what happened next.” The generator description is “Click the bong and see what comes to mind.” Its implementation remains a fixed public corpus.

On 2026-10-01 the owner explicitly requested publishing the seven-event timeline to GitHub and Netlify after rejecting the inherited event-approval requirement. This supersedes the earlier development-only timeline restriction. The existing noindex setting, launch flags, long-form draft exclusion and policy drafts are unaffected.

The Home teaser is “Ideas that made history.” The About “BONG’s version · Fiction” label and the archive's visible introduction are removed at the owner's request. The seven sourced dock events appear publicly and Home must not mark Through Time as Coming soon. The shared presentation also supports published long-form entries, preserves their factual/narration separation, and provides search when the existing count threshold is reached. Every event remains readable without JavaScript.

Public terms/privacy/accessibility JSON must contain approved title/version/sections and genuine `approvedBy`/`approvedAt`. V1 notices describe browser generator storage, public content, hosting logs and real contacts accurately; they must not imply active accounts, uploads, verified age, live AI or private account services. Community rules and member retention/export/deletion policy become mandatory before v2 opens.

The 2026-10-01 policy copy revisions live separately in `content/previews/legal/`. They require a draft version and empty approval fields, render only in development, and display “Draft for review.” Approved production policy files remain unchanged until actual approval is supplied. In particular, the existing approved Accessibility wording still refers to the former Contact page; replacement approval remains outstanding.

The owner explicitly wants no public Contact section or email address. Contact navigation and the sitemap entry are removed, and the legacy URL permanently redirects to Community's existing official social links. This UI decision does not fabricate monitored support/security contacts or waive the release requirements that currently ask for them; any change to those requirements needs an explicit owner/security decision.

## Approval records

Each `content/site.json.approvals` record has `{approvedBy, approvedAt, evidence}` and must refer to real review of the candidate. Empty records remain missing; scripts cannot authenticate the reviewer.

Both scopes require `visual`, `artworkRights`, `ideaEditorial`, `legal`, `independentSecurityReview`, `manualAccessibility`, `loadAndPerformance`, and `productionAuthorization`.

V1 additionally requires `publicHosting` (actual public hosting region, budget, access and incident contacts) and `publicDeploymentReview` (public staging/edge HTTPS, canonical origin, CSP/cache behavior, direct dormant-route denial and configured identity links). These replace the private-provider portions of the old mixed approvals.

Community v2 instead retains `providersBudgetRegion`, `moderationStaffing`, `restoreDrill` and `stagingIntegrations`, together with approved community rules and actual provider/database/private-media/account checks.

## Evidence and authorization

The automated report in `release-evidence.json` must identify `scope: "v1"` or `scope: "community"` and the exact source candidate. Default `release:check` uses `v1-acceptance-evidence.json` and `v1-asvs-evidence.json`. `release:check -- --scope=community` uses the preserved full matrices. Do not rebind historical provider/community passes to a new source hash without rerunning their actual scope.

Script success does not replace manual reviews or owner approval. Every applicable public requirement stays a blocker until supported; deferred v2 requirements do not block v1. Actual production deployment, DNS changes and paid provisioning still require explicit authorization.
