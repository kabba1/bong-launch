# Editorial and release process

Current release scope is public **v1** as described in [V1_SCOPE.md](V1_SCOPE.md). The community implementation remains disabled and is subject to a separate future release. Do not create a database, SMTP/CAPTCHA service, staff identity or private bucket just to clear a public v1 check.

`content/site.json` holds reviewed public identity/configuration. Token mode starts `not_launched`; never guess an address, network, social account or project URL. Live token mode needs exact owner-verified identifiers, official URL and creator-interest disclosure. Only configured genuine social links render; missing values are omitted. No wallet or transaction capability is included.

The supplied art, visual direction and all 1,000 exact idea texts require owner approval. Use explicit known-ID withdrawals for concerning entries; never silently rewrite the original corpus or reassign an ID. Public active content and its hash are deterministic. SQL catalog generation remains compatible with v2, but no database deployment is needed in v1.

At least **eight** public timeline entries need real reviewers, claim-level sources, accurate uncertainty/date treatment and actual rights for included images. This requirement was not waived by the v1 scope change. Follow the timeline schema, use numeric sortYear rather than parsing human BCE labels, and visibly distinguish fictional BONG narration from historical facts. Never add fabricated reviews, fixture articles, executable HTML or MDX.

## Timeline voice — owner clarification, 2026-09-30

The owner clarified the premise after reviewing the public copy: Through Time is an educational, scrollable chronology of highlighted moments across human history. Readers should learn accurate facts. BONG supplies a quiet narrator's voice, with the impression of a witness rather than the cause of events. This supersedes the original premise that BONG supplied historical ideas and the later credit-taking gag; do not reinstate either from historical specifications or reports.

- Research the actual event, explain something worth learning, and credit the real people and work involved. Preserve uncertainty and shared attribution; do not reduce everything to a lone genius or a sudden revelation.
- Write the short narrative part as BONG telling the story, without repeatedly announcing that BONG was there. Use an observant aside or perspective rather than an alternative account of what happened. The existing `fictionText` field holds this fictional narrator's contribution; the sourced factual fields and references remain authoritative.
- Never claim or directly imply that BONG, a bong rip, cannabis or drug use caused, inspired, enabled or influenced a historical person, invention, idea or event. Do not use attribution jokes such as “The wheel? BONG,” a credit-taking tagline, invented conversations with real figures or invented actions by them.
- Keep the public label **BONG’s narration · Fiction** distinct from **The history** in archive cards and detail pages. Fiction applies to the imagined narrator, not an excuse to distort facts. Do not remove the source links or claim-level review gates to make the voice subtler.
- Keep the chronology normally scrollable and date-ordered with accessible highlighted entries. This voice clarification does not authorize invented articles, sources, dates, reviewer records or publication of unreviewed drafts. Genuine reviewed content is still required before populating the timeline.

Public introduction: **A closer look at human history.** About describes a long memory and an eye for detail, with no claim of historical credit or influence.

Public terms/privacy/accessibility JSON must contain approved title/version/sections and genuine `approvedBy`/`approvedAt`. V1 notices describe browser generator storage, public content, hosting logs and real contacts accurately; they must not imply active accounts, uploads, verified age, live AI or private account services. Community rules and member retention/export/deletion policy become mandatory before v2 opens.

## Approval records

Each `content/site.json.approvals` record has `{approvedBy, approvedAt, evidence}` and must refer to real review of the candidate. Empty records remain missing; scripts cannot authenticate the reviewer.

Both scopes require `visual`, `artworkRights`, `ideaEditorial`, `legal`, `independentSecurityReview`, `manualAccessibility`, `loadAndPerformance`, and `productionAuthorization`.

V1 additionally requires `publicHosting` (actual public hosting region, budget, access and incident contacts) and `publicDeploymentReview` (public staging/edge HTTPS, canonical origin, CSP/cache behavior, direct dormant-route denial and configured identity links). These replace the private-provider portions of the old mixed approvals.

Community v2 instead retains `providersBudgetRegion`, `moderationStaffing`, `restoreDrill` and `stagingIntegrations`, together with approved community rules and actual provider/database/private-media/account checks.

## Evidence and authorization

The automated report in `release-evidence.json` must identify `scope: "v1"` or `scope: "community"` and the exact source candidate. Default `release:check` uses `v1-acceptance-evidence.json` and `v1-asvs-evidence.json`. `release:check -- --scope=community` uses the preserved full matrices. Do not rebind historical provider/community passes to a new source hash without rerunning their actual scope.

Script success does not replace manual reviews or owner approval. Every applicable public requirement stays a blocker until supported; deferred v2 requirements do not block v1. Actual production deployment, DNS changes and paid provisioning still require explicit authorization.
