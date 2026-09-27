# Operating BONG

These procedures describe implemented controls and required drills. Provider-console configuration, actual alerts, staff identity and deployment have not been completed by generating this file. Record who ran each staging drill, exact candidate, observed result and artifact. Never test destructive recovery against the only production copy.

## Review posts, edits and images

Sign in at `/sign-in`, verify the approved authenticator at `/account/security`, then open `/moderation`. Private reads require approved-factor MFA; writes require a step-up within 15 minutes. Select a pending item, read the exact candidate and any currently public revision, inspect only sanitized images, and approve or reject with an author-visible reason. Private notes are separate. Image authors cannot approve their own submissions. Stale decisions return 409; reload and review the new state instead of clicking repeatedly. An approved prior revision stays public during pending/rejected edits.

Use Members to grant/revoke trusted text, suspend ordinary members, or (admin only) ban/unban. Trust cannot be self-granted and never bypasses image review. Banning revokes application access; hide-content is a separate explicit action. Staff roles never come from profile metadata or this UI.

## Reports and urgent removal

Review the Reports queue, including severity and context. Reporter identity and private notes stay confidential. Resolve/escalate with an actual decision; report counts do not automatically remove a post. Follow the owner-approved safety/legal escalation and appeal process. Its real contacts and response schedule remain a launch input.

Hide a harmful post/comment with a reason. New private-media access issuance stops. Previously signed URLs may work for up to 60 seconds; downloaded copies cannot be recalled. Quarantined/deleted variants enter durable object-deletion work. For an urgent storage incident, close uploads/posting and use provider-side quarantine/removal through the approved operator procedure; retain only justified restricted evidence.

## Read-only incident mode

At `/admin/audit`, use incident controls with fresh approved-factor MFA. Close posting and uploads; server/database checks enforce this even for forged direct requests. Environment flags can also close participation immediately through the host configuration. Turning a switch back on never publishes the pending queue or replays failed requests. Public generator and approved timeline content continue during backend outages.

## Account requests

Members use `/account/data` and confirm a fresh email code; staff also require approved MFA. Export enqueues a private JSON/media-manifest job; `/account/jobs/:id` reauthorizes short-lived access. Never send an export in a public link or disclose another user's notes/reports. Exports expire after 24 hours.

Deletion immediately freezes writes and public visibility and revokes sessions. The worker cleans revisions/search/media, detaches eligible references, removes private state/factors/sessions and finally deletes the provider identity. Other authors' independent content is preserved. Storage/provider failure produces retry state with bounded backoff, never success. Inspect failed jobs with the maintenance identity, verify the failure category without logging payloads, resolve the dependency and retry through the lease mechanism. Do not manually flip completed status. The last active admin requires ownership transfer before normal deletion.

## Maintenance and retention

Run `npm run maintenance` only in the intended environment with the separate maintenance DB/provider/scheduler secret access. The internal worker leases bounded batches, purges expired unattached images and exports, deletes queued derivatives, and advances export/deletion jobs. Schedule actual runs and alert on failed/stale jobs. Repeated execution must be safe; verify this in staging with simulated network failures and elapsed-time fixtures.

Engineering defaults: local draft 24h; unattached images 24h; idempotency 24h; rate buckets within 48h after their window; retained removed/rejected content up to 30d; audit 180d; export 24h; live account cleanup within 30d. Ordinary logs target 30d outside the DB. Owner/legal approval and provider log/backup alignment are still required. A legal hold needs an explicitly reviewed operational procedure; no blanket indefinite retention promise is made.

## Recover or revoke staff

An owner uses the separate verified-identity CLI. `staff:manage -- --action revoke --userId <uuid> --reason "<real reason>"` revokes the role and sessions with audit. Lost TOTP requires the owner/provider recovery process and an actual verified replacement factor, then `--action recover --factorId <uuid>`. No secret bypass URL, global MFA disable switch or email-only replacement exists. Test recovery with designated staging staff and retain proof; do not test on the final recovery administrator.

## Corpus withdrawals and history corrections

Review the exact source idea, add its known ID to `content/idea-overrides.json`, run all content checks/build, review the resulting hash/catalog tombstone, deploy with the corrected application metadata and purge first-party caches. Canonical withdrawn routes return removal status; IDs are never reassigned. Downloaded public data cannot be recalled. Preserve the exact source collection.

For timeline corrections, edit structured JSON, confirm claim-to-source support, increment revision/review date, and add a correction note for substantive changes. Never publish draft fixtures. Any new historical asset needs rights records. Validate and review through source control.

## Backup and restore drill

Back up SQL **and actual private Storage object bytes** separately with encrypted restricted backups and owner-approved retention (target at least seven daily restore points). Keep content/configuration references and a deletion/takedown ledger separately recoverable. Database backups do not contain storage object bytes. Credentials may need recreation/rotation after restore.

Restore to a new isolated project with outgoing email and participation disabled. Verify schema/roles/RLS, revision-parent pointers, content hash, current media checksums/references, accounts/session revocation, no public pending material and no unintended emails. Reapply the deletion/takedown ledger before reopening access so a restore cannot republish removed material. Measure recovery time and data loss against proposed 8h RTO/24h RPO targets. No successful restore is claimed until this drill is actually recorded.

## Rollback and deployment

Close writes, retain the current database/takedown state, roll back to the last compatible application artifact, and verify health and visibility. Do not blindly reverse schema migrations. Future schema changes use expand/migrate/contract. Any rollback must retain current bans, deletions and corrected official token destinations. `release:check` and the full acceptance matrix remain the go/no-go record.

## Cost and alerts

Owner-approved limits and provider plans are required before upload launch. Configure spending notices at approved thresholds and record which services offer real caps versus alerts. Monitor image processing failures, storage/egress, database connections and queue age. Close uploads/posting under anomalous load while investigating. No claim is made that an alert prevents charges or that free tiers suffice.

Upload cleanup tombstones: deletion waits for live five-minute upload reservations. Late completion/failure can durably requeue only the reserved fixed object keys using an unreturned server cleanup capability. Worker acknowledgments include the current deletion generation. After identity purge, reservation owner/session references are cleared; fixed-key tombstones expire after 30 days once required storage cleanup is complete. Include this bounded technical record in the approved retention notice and verify the actual scheduler/object store behavior; never log the capability or extend retention silently.
