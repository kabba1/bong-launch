# Editing BONG content

Current launch instructions live in [V1_LAUNCH.md](V1_LAUNCH.md). This file is a developer content map.

- **Ideas:** preserve `content/source/bong_highdeas_1000_revised.csv`, its .gitattributes rule, all IDs, exact strings and category mappings. `content:validate` checks source equality and generated hashes. Use explicit known-ID withdrawals rather than silently rewriting supplied ideas.
- **Through Time:** the current seven short events are in `src/features/timeline/events.ts`, rendered by the scrolling `TimelineDock.tsx` component. Keep dates, facts and source links accurate. No eighth event or reviewer JSON is required. The generated `content/generated/timeline.json` refers to separate long-form articles; it may be empty while all seven public events are present.
- **Narration:** BONG's presence is understated. Do not claim that drugs or a bong rip caused historical achievements. Keep the existing About lore; do not rewrite the character during repository maintenance.
- **Policies:** `content/legal/` holds currently published notices. The existing schema still validates title, version, sections and approval metadata; do not forge that metadata. `content/previews/legal/` contains development-only drafts with empty approval fields. They never fall back into production. The single outstanding Accessibility decision is in the launch checklist.
- **Official configuration:** `content/site.json` supplies real social URLs and `not_launched` token state. Its empty contacts/approvals fields remain for compatibility; public v1 does not require them. The runtime validates structure and token consistency, not ownership or independent review.
- **Assets:** use the supplied art and local fonts recorded in [ASSETS.md](ASSETS.md).

Long-form article validation and draft exclusion remain intact for possible future use. Dormant community rules, policy versions, credentials and provider setup are not v1 inputs. No generated evidence file grants permission to publish.
