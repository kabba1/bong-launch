# BONG BFF contract

All account/community data travels through `/api`. The browser has no provider Auth, SQL, or Storage client. The API is private `no-store`, including public board responses and media authorization. Successful responses are `{data,requestId}`; paged results may also include `page`. Failure responses are `{error:{code,message,fields?},requestId}`. Clients must preserve inputs on failure and distinguish 201 `pending` from `published`; 202 means a durable job was queued.

Every browser mutation requires its exact configured `Origin`, `X-Bong-Request: 1`, and `X-CSRF-Token`. Obtain a token with `GET /api/security/csrf`, whose response is `{data:{token}}`. The vetted `csrf-csrf` implementation signs and binds it to the registered session and assurance level; unauthenticated forms use a random host-only context cookie. Fetch a new token after login, sign-out, refresh, or MFA elevation. Cookies are HttpOnly, host-only, SameSite=Lax, and Secure with `__Host-` prefixes outside explicit loopback local development. Never persist Auth tokens in client storage.

Ordinary writes send `application/json`; unknown fields are rejected. JSON bodies are capped at 32 KiB of actual streamed bytes. Browser uploads use a single FormData `file` and `captchaToken`, up to 3 MiB per file / 4 MiB total. Limits apply even when Content-Length is missing or lies. Request parsing and image decoding are bounded. Do not forward arbitrary URLs, bucket names, storage keys, role fields, author IDs, or provider settings.

The authoritative input schemas are `src/server/security/schemas.ts`; the endpoint table is `src/server/services/router.ts`.

| Endpoint | Request / response |
|---|---|
| GET session | `{user:{id}|null,member,onboarded,role,mfaRequired,approvedFactorIds,postingEnabled,uploadsEnabled,registrationEnabled,turnstileSiteKey,rulesVersion,termsVersion}` |
| POST auth/request-code | `{email,captchaToken}` → non-enumerating `{message,resendAfter:60}`; provider outages return 503 |
| POST auth/verify-code | `{email,code,returnTo?}` → `{onboarded,returnTo}` and server-managed cookies |
| POST auth/reauthenticate | `{email,code}` → `{reauthenticated:true}`; new provider code must belong to current account |
| POST auth/sign-out, auth/sign-out-all | `{}`; all-session revocation requires recent reauthentication |
| POST auth/mfa/enroll | `{}` → `{factorId,totp:{qr_code,secret,uri}}`; protected staff bootstrap/existing approved factor required |
| POST auth/mfa/verify | `{factorId,code}` → `{verified:true}`; factor must be protected approved/pending enrollment, never arbitrary provider aal2 |
| POST onboarding | `{handle,displayName,rulesVersion,termsVersion,adultAcknowledged:true}` |
| PATCH account/profile | `{displayName,bio,expectedVersion}` |
| GET account/content | Own content, bounded cursor/limit/state |
| GET board/posts | Optional kind/query/cursor/limit; stable published-only feed |
| POST board/posts | `{kind,title,body,projectUrl?,sourceIdeaId?,assets:[{id,altText}],idempotencyKey}` |
| GET/PATCH/DELETE board/posts/:id | Read authorized post; edit submits a new immutable revision with `expectedVersion`; deletion requires `{expectedVersion,confirmed:true}` |
| GET/POST board/posts/:id/comments | List; submit `{body,replyToCommentId?,idempotencyKey}` |
| PATCH/DELETE board/comments/:id | Edit `{body,expectedVersion}`; delete `{expectedVersion,confirmed:true}` |
| POST uploads | Single multipart raster with separate application-verified Turnstile action `upload` |
| DELETE uploads/:id | `{}`; unattached own asset only |
| GET media/:id/main or thumb | Authorizes exact current revision or owner/staff preview; 307 to a private URL expiring in 60 seconds |
| POST reports | `{targetType,targetId,reason,detail?,captchaToken?}`; visitors require separate Turnstile action `report` |
| GET members/:handle | Minimal public profile and published contributions |
| GET moderation/queue, moderation/review/:id, moderation/members/:id | Approved-factor MFA; private queue, exact review candidate, and allowed member state |
| POST moderation/decisions | `{targetType,id,revisionId?,expectedVersion,action,reason,privateNote?}` |
| POST moderation/members/:id/status | `{action,reason,until?}`; limited by current staff role, never staff grants |
| GET admin/audit, admin/features | Admin and approved-factor MFA |
| POST admin/features | `{name,value,expectedVersion,reason}`; can tighten operational switches |
| POST account/export | `{}` after reauthentication → durable job |
| POST account/delete | `{confirmation:"DELETE MY ACCOUNT"}` after reauthentication → freeze and durable job |
| GET account/jobs, account/jobs/:id | Own jobs only; completed export downloads require fresh email reauthentication and provider identity lookup, plus fresh approved MFA for staff, before 60-second signing |
| POST internal/maintenance | Separate Bearer credential, no Cookie or Origin, `{}`; leased jobs and retention work |
| GET health/live | Minimal liveness; no backend dependency |
| GET health/ready | Separate internal Bearer credential; private readiness |

Post and comment submission idempotency is scoped to actor/action for 24 hours. The server computes a canonical payload hash. Replay rechecks authorization and returns the committed resource; changed payloads conflict. Database submission limits are inside the same transaction, after replay checks. All other shared limits use protected atomic SQL buckets with HMAC subjects. Trusted IP metadata is accepted only from Vercel's overwritten platform header; local loopback uses one shared local subject, never caller X-Forwarded-For.

Auth Turnstile tokens go directly to Supabase Auth and are not consumed twice. Application report/upload tokens go to the fixed Cloudflare Siteverify endpoint and must match exact configured hostname and action. URLs submitted in post content are never fetched by this server.

Email identity follows [Supabase Auth's own lowercase storage and lookup](https://github.com/supabase/auth/blob/master/internal/models/user.go). Rate limits therefore cannot be evaded through case variants; dots and plus tags remain intact.

Image inputs are decoded by sharp with 24M-pixel/8,000px/page/type limits, then rotated and rewritten as metadata-free WebP main and thumbnail variants. Originals are discarded. Storage is verified private before put/sign. Reserved SQL records survive partial upload failures and feed cleanup jobs. Previously issued media links may remain usable for up to 60 seconds after removal; saved copies cannot be recalled.

Permission is checked again after the storage signing call, before returning any media/export URL. A permission change during provider latency withholds the generated URL. SQL transactions are never held open while calling storage.

Maintenance must be scheduled by the owner-approved host and monitored. The internal endpoint uses separate maintenance SQL credentials. Run `npm run maintenance` for an authorized manual sweep. Job claims have leases and retries; provider deletion is attempted only after cleanup approval. Owner staff changes use `npm run staff:manage -- --action grant --userId <verified-uuid> --role moderator --reason <reason>` with separate owner credentials. Recovery additionally requires `--factorId <verified-totp-factor-uuid>`; it never disables MFA globally. No production credential or provisioning is included.

External staging evidence remains required: real SMTP delivery and configured 10-minute code expiry/provider throttles, provider CAPTCHA including direct-provider bypass attempts, production header trust, cookie/cache isolation, private Storage policies and 60-second expiry, actual maintenance scheduling/alerts, and Auth identity deletion. Local unit tests do not claim these provider controls were provisioned or verified.

Environment values are listed without credentials in `.env.example`. `BONG_DATABASE_CA_CERT` optionally supplies the owner's provider CA certificate while certificate verification remains enabled. `SECURITY_TXT_EXPIRES` records the owner-approved contact expiry; it must not be fabricated to pass a release gate. CLI secrets are supplied through environment/secret-store configuration (or an explicitly selected local dotenv path); owner and migration credentials do not belong in the deployed HTTP application's environment.
