-- BONG v1. Apply only with the reviewed migration identity, never runtime.
-- Supabase auth.users must already exist. No production people or content are seeded.
BEGIN;
CREATE ROLE bong_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE bong_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE bong_maintenance LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE SCHEMA bong AUTHORIZATION bong_owner;
REVOKE ALL ON SCHEMA bong FROM PUBLIC;
GRANT USAGE ON SCHEMA bong TO bong_runtime, bong_maintenance;
GRANT USAGE ON SCHEMA auth TO bong_owner;
GRANT REFERENCES(id) ON auth.users TO bong_owner;
SET LOCAL ROLE bong_owner;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA bong REVOKE ALL ON TABLES FROM PUBLIC;

CREATE TABLE bong.members (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
 handle text UNIQUE CHECK(handle IS NULL OR handle ~ '^[a-z0-9][a-z0-9_]{2,23}$'),
 display_name text CHECK(display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 40),
 bio text NOT NULL DEFAULT '' CHECK(char_length(bio)<=240),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE UNIQUE INDEX members_handle_normalized ON bong.members(lower(handle)) WHERE handle IS NOT NULL;
CREATE TABLE bong.member_state (
 user_id uuid PRIMARY KEY REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','suspended','banned','deleting','deleted')),
 trusted_text boolean NOT NULL DEFAULT false, suspension_until timestamptz,
 rules_version text, terms_version text, accepted_at timestamptz, adult_acknowledged_at timestamptz,
 state_reason text CHECK(char_length(state_reason)<=1000)
);
CREATE TABLE bong.staff_roles (
 user_id uuid PRIMARY KEY REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 role text NOT NULL CHECK(role IN ('moderator','admin')), granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz, grant_reason text NOT NULL, bootstrap_allowed boolean NOT NULL DEFAULT false
);
CREATE TABLE bong.staff_mfa_factors (
 factor_id text PRIMARY KEY CHECK(char_length(factor_id) BETWEEN 1 AND 200),
 user_id uuid NOT NULL REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 status text NOT NULL CHECK(status IN ('pending','approved','revoked')),
 approved_at timestamptz, revoked_at timestamptz, evidence text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE bong.app_sessions (
 session_id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days', revoked_at timestamptz,
 step_up_at timestamptz, factor_id text REFERENCES bong.staff_mfa_factors(factor_id) ON DELETE RESTRICT,
 reauthenticated_at timestamptz, registration_request_id text NOT NULL,
 CHECK(expires_at<=created_at+interval '30 days')
);
CREATE INDEX sessions_user ON bong.app_sessions(user_id,revoked_at);
CREATE TABLE bong.idea_catalog (
 id text PRIMARY KEY CHECK(id ~ '^BONG-[0-9]{4}$'), category_id text NOT NULL,
 source_text_sha256 text NOT NULL CHECK(source_text_sha256 ~ '^[a-f0-9]{64}$'),
 dataset_version text NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE bong.posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_id uuid REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN ('hear_me_out','made_this')),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','published','hidden','deleted')),
 approved_revision_id uuid, latest_revision_id uuid, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 hidden_at timestamptz, deleted_at timestamptz, search_vector tsvector NOT NULL DEFAULT ''::tsvector,
 CHECK(author_id IS NOT NULL OR state='deleted'), CHECK(state<>'published' OR approved_revision_id IS NOT NULL)
);
CREATE TABLE bong.post_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES bong.posts(id) ON DELETE RESTRICT,
 revision_number integer NOT NULL CHECK(revision_number>0),
 title text NOT NULL CHECK(char_length(title) BETWEEN 5 AND 100 AND title=btrim(title) AND title !~ '[[:cntrl:]]'),
 body text NOT NULL CHECK(char_length(body) BETWEEN 20 AND 5000),
 project_url text CHECK(project_url IS NULL OR (char_length(project_url)<=2048 AND project_url ~ '^https://[^/@[:space:]]+([/:?#]|$)' AND project_url !~ '[[:cntrl:]]')),
 source_idea_id text REFERENCES bong.idea_catalog(id) ON DELETE RESTRICT,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected','superseded')),
 author_reason text, submitted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(post_id,revision_number), UNIQUE(post_id,id)
);
ALTER TABLE bong.posts ADD CONSTRAINT posts_approved_same_parent FOREIGN KEY(id,approved_revision_id) REFERENCES bong.post_revisions(post_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE bong.posts ADD CONSTRAINT posts_latest_same_parent FOREIGN KEY(id,latest_revision_id) REFERENCES bong.post_revisions(post_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE;
CREATE UNIQUE INDEX one_pending_post_revision ON bong.post_revisions(post_id) WHERE state='pending';
CREATE INDEX published_posts_cursor ON bong.posts(published_at DESC,id DESC) WHERE state='published';
CREATE INDEX posts_author_time ON bong.posts(author_id,created_at DESC,id DESC);
CREATE INDEX posts_search ON bong.posts USING gin(search_vector) WHERE state='published';
CREATE TABLE bong.media_assets (
 id uuid PRIMARY KEY, owner_id uuid REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 bound_post_id uuid REFERENCES bong.posts(id) ON DELETE RESTRICT,
 main_key text NOT NULL UNIQUE, thumb_key text NOT NULL UNIQUE,
 mime text NOT NULL CHECK(mime='image/webp'), width integer NOT NULL CHECK(width BETWEEN 1 AND 2048), height integer NOT NULL CHECK(height BETWEEN 1 AND 2048),
 main_bytes integer NOT NULL CHECK(main_bytes BETWEEN 1 AND 3145728), thumb_bytes integer NOT NULL CHECK(thumb_bytes BETWEEN 1 AND 3145728),
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'), state text NOT NULL DEFAULT 'unattached' CHECK(state IN ('unattached','attached','quarantined','deleted')),
 created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 CHECK(owner_id IS NOT NULL OR state='deleted')
);
CREATE INDEX media_owner_state ON bong.media_assets(owner_id,state,created_at);
CREATE TABLE bong.revision_assets (
 revision_id uuid NOT NULL REFERENCES bong.post_revisions(id) ON DELETE RESTRICT,
 asset_id uuid NOT NULL REFERENCES bong.media_assets(id) ON DELETE RESTRICT,
 position integer NOT NULL CHECK(position BETWEEN 0 AND 3), alt_text text NOT NULL CHECK(char_length(alt_text) BETWEEN 10 AND 300 AND alt_text !~ '[[:cntrl:]]'),
 PRIMARY KEY(revision_id,asset_id), UNIQUE(revision_id,position)
);
CREATE TABLE bong.comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES bong.posts(id) ON DELETE RESTRICT,
 author_id uuid REFERENCES bong.members(user_id) ON DELETE RESTRICT, reply_to_comment_id uuid,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','published','hidden','deleted')),
 approved_revision_id uuid, latest_revision_id uuid, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 UNIQUE(post_id,id), CHECK(author_id IS NOT NULL OR state='deleted'),
 FOREIGN KEY(post_id,reply_to_comment_id) REFERENCES bong.comments(post_id,id) ON DELETE RESTRICT,
 CHECK(state<>'published' OR approved_revision_id IS NOT NULL)
);
CREATE TABLE bong.comment_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), comment_id uuid NOT NULL REFERENCES bong.comments(id) ON DELETE RESTRICT,
 revision_number integer NOT NULL CHECK(revision_number>0), body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 2000),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected','superseded')),
 author_reason text, submitted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(comment_id,revision_number), UNIQUE(comment_id,id)
);
ALTER TABLE bong.comments ADD CONSTRAINT comments_approved_same_parent FOREIGN KEY(id,approved_revision_id) REFERENCES bong.comment_revisions(comment_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE bong.comments ADD CONSTRAINT comments_latest_same_parent FOREIGN KEY(id,latest_revision_id) REFERENCES bong.comment_revisions(comment_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE;
CREATE UNIQUE INDEX one_pending_comment_revision ON bong.comment_revisions(comment_id) WHERE state='pending';
CREATE INDEX comments_post_cursor ON bong.comments(post_id,created_at,id) WHERE state IN ('published','deleted');
CREATE TABLE bong.reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_type text NOT NULL CHECK(target_type IN ('post','comment','member','idea','timeline')),
 target_id text NOT NULL CHECK(char_length(target_id) BETWEEN 1 AND 200), reporter_id uuid REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 reason text NOT NULL CHECK(reason IN ('spam_scam','harassment','privacy','dangerous_illegal','misleading_authorship','factual_correction','copyright_rights','other')),
 detail text NOT NULL DEFAULT '' CHECK(char_length(detail)<=1000), status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','escalated','resolved')),
 resolution text, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE UNIQUE INDEX coalesce_member_reports ON bong.reports(reporter_id,target_type,target_id) WHERE reporter_id IS NOT NULL AND status<>'resolved';
CREATE INDEX reports_queue ON bong.reports(status,created_at);
CREATE TABLE bong.moderation_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 actor_role text, session_id uuid, target_type text NOT NULL, target_id text NOT NULL, revision_id uuid,
 action text NOT NULL, reason text NOT NULL CHECK(char_length(reason) BETWEEN 1 AND 1000), private_note text CHECK(char_length(private_note)<=2000),
 previous_state text, new_state text, request_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_time ON bong.moderation_actions(created_at DESC,id DESC);
CREATE TABLE bong.idempotency_records (
 actor_id uuid NOT NULL REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 action text NOT NULL, key text NOT NULL CHECK(char_length(key) BETWEEN 8 AND 128), request_hash text NOT NULL,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 PRIMARY KEY(actor_id,action,key)
);
CREATE INDEX idempotency_expiry ON bong.idempotency_records(expires_at);
CREATE TABLE bong.rate_buckets (
 subject_key text NOT NULL CHECK(subject_key ~ '^[a-f0-9]{64}$'), action text NOT NULL, window_start timestamptz NOT NULL,
 consumed bigint NOT NULL CHECK(consumed>=0), expires_at timestamptz NOT NULL,
 PRIMARY KEY(subject_key,action,window_start)
);
CREATE INDEX rate_expiry ON bong.rate_buckets(expires_at);
CREATE TABLE bong.account_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN ('export','deletion')),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','retry','complete','failed')),
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz,
 phase text NOT NULL DEFAULT 'queued', provider_subject uuid, export_key text, expires_at timestamptz, error_code text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE UNIQUE INDEX one_account_job ON bong.account_jobs(user_id,kind) WHERE status IN ('queued','processing','retry');
CREATE INDEX account_jobs_due ON bong.account_jobs(status,next_attempt_at);
CREATE TABLE bong.operational_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, actor_hash text, request_id text NOT NULL,
 severity text NOT NULL CHECK(severity IN ('info','warning','error')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE bong.feature_settings (
 name text PRIMARY KEY CHECK(name IN ('posting_enabled','uploads_enabled','registrations_enabled','review_everything')),
 enabled boolean NOT NULL, version integer NOT NULL DEFAULT 1, actor_id uuid REFERENCES bong.members(user_id) ON DELETE RESTRICT,
 reason text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO bong.feature_settings(name,enabled,reason) VALUES ('posting_enabled',false,'Owner release gate'),('uploads_enabled',false,'Owner release gate'),('registrations_enabled',false,'Owner release gate'),('review_everything',true,'Review all launch submissions');
CREATE TABLE bong.object_deletions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket text NOT NULL CHECK(bucket IN ('media','exports')),
 object_key text NOT NULL, asset_id uuid REFERENCES bong.media_assets(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','retry','complete','failed')),
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, error_code text,
 generation bigint NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 UNIQUE(bucket,object_key)
);
CREATE INDEX objects_due ON bong.object_deletions(status,next_attempt_at);
CREATE TABLE bong.deletion_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid NOT NULL UNIQUE REFERENCES bong.account_jobs(id) ON DELETE RESTRICT,
 user_hash text NOT NULL, resource_ids jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), provider_deleted_at timestamptz
);
CREATE TABLE bong.retention_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_type text NOT NULL CHECK(target_type IN ('member','post','comment','asset')),
 target_id text NOT NULL, reason text NOT NULL CHECK(char_length(reason) BETWEEN 1 AND 1000),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK(expires_at>created_at)
);
CREATE TABLE bong.upload_reservations (
 id uuid PRIMARY KEY, owner_id uuid REFERENCES bong.members(user_id) ON DELETE SET NULL,
 main_key text NOT NULL UNIQUE, thumb_key text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','complete','aborted')),
 session_id uuid, cleanup_token_hash text NOT NULL,
 lease_until timestamptz DEFAULT now()+interval '5 minutes',
 deletion_job_id uuid REFERENCES bong.account_jobs(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION bong.actor_id() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$ SELECT nullif(current_setting('app.actor_id',true),'')::uuid $$;
CREATE FUNCTION bong.session_id() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$ SELECT nullif(current_setting('app.session_id',true),'')::uuid $$;
CREATE FUNCTION bong.session_live() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM bong.app_sessions s JOIN bong.member_state m ON m.user_id=s.user_id
 WHERE s.session_id=bong.session_id() AND s.user_id=bong.actor_id() AND s.revoked_at IS NULL
 AND s.expires_at>now() AND s.last_seen_at>now()-interval '7 days' AND m.state<>'deleted') $$;
CREATE FUNCTION bong.active_member() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT bong.session_live() AND EXISTS(SELECT 1 FROM bong.member_state s JOIN bong.members m USING(user_id)
 WHERE s.user_id=bong.actor_id() AND (s.state='active' OR (s.state='suspended' AND s.suspension_until<=now()))
 AND m.handle IS NOT NULL AND s.accepted_at IS NOT NULL AND s.adult_acknowledged_at IS NOT NULL) $$;
CREATE FUNCTION bong.staff_role(fresh boolean DEFAULT false) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.role FROM bong.staff_roles r JOIN bong.app_sessions s ON s.user_id=r.user_id
 JOIN bong.staff_mfa_factors f ON f.factor_id=s.factor_id AND f.user_id=r.user_id
 WHERE r.user_id=bong.actor_id() AND r.revoked_at IS NULL AND s.session_id=bong.session_id() AND bong.active_member()
 AND current_setting('app.actor_aal',true)='aal2' AND f.status='approved' AND s.step_up_at IS NOT NULL
 AND (NOT fresh OR s.step_up_at>now()-interval '15 minutes') $$;
CREATE FUNCTION bong.flag(flag_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT enabled FROM bong.feature_settings WHERE name=flag_name $$;
CREATE FUNCTION bong.can_post(post_key uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM bong.posts p WHERE p.id=post_key AND (p.state='published' OR (bong.session_live() AND p.author_id=bong.actor_id()) OR bong.staff_role() IS NOT NULL)) $$;
CREATE FUNCTION bong.can_revision(revision_key uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM bong.post_revisions r JOIN bong.posts p ON p.id=r.post_id WHERE r.id=revision_key AND
 ((p.state='published' AND p.approved_revision_id=r.id AND r.state='approved') OR (bong.session_live() AND p.author_id=bong.actor_id()) OR bong.staff_role() IS NOT NULL)) $$;
CREATE FUNCTION bong.can_comment(comment_key uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM bong.comments c JOIN bong.posts p ON p.id=c.post_id WHERE c.id=comment_key AND
 ((p.state='published' AND c.state IN ('published','deleted')) OR (bong.session_live() AND c.author_id=bong.actor_id()) OR bong.staff_role() IS NOT NULL)) $$;
CREATE FUNCTION bong.can_comment_revision(revision_key uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM bong.comment_revisions r JOIN bong.comments c ON c.id=r.comment_id JOIN bong.posts p ON p.id=c.post_id WHERE r.id=revision_key AND
 ((p.state='published' AND c.state='published' AND c.approved_revision_id=r.id AND r.state='approved') OR (bong.session_live() AND c.author_id=bong.actor_id()) OR bong.staff_role() IS NOT NULL)) $$;
CREATE FUNCTION bong.can_media(asset_key uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM bong.media_assets a WHERE a.id=asset_key AND a.state IN ('unattached','attached') AND
 ((bong.session_live() AND a.owner_id=bong.actor_id() AND (a.bound_post_id IS NULL OR EXISTS(SELECT 1 FROM bong.posts p WHERE p.id=a.bound_post_id AND p.state NOT IN ('hidden','deleted'))))
 OR bong.staff_role() IS NOT NULL OR EXISTS(SELECT 1 FROM bong.revision_assets ra JOIN bong.posts p ON p.approved_revision_id=ra.revision_id
 WHERE ra.asset_id=a.id AND p.state='published'))) $$;

DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='bong' LOOP
  EXECUTE format('ALTER TABLE bong.%I ENABLE ROW LEVEL SECURITY',t.tablename);
  EXECUTE format('ALTER TABLE bong.%I FORCE ROW LEVEL SECURITY',t.tablename);
  EXECUTE format('CREATE POLICY owner_internal ON bong.%I TO bong_owner USING (true) WITH CHECK (true)',t.tablename);
 END LOOP;
END $$;

-- Maintenance has a distinct credential and cannot bootstrap/change staff.
-- Only immutable, previously reserved paths can be compensated. A generation
-- prevents an older remote delete acknowledgement from completing newer work.
CREATE FUNCTION bong.abort_upload(reservation_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE reservation bong.upload_reservations;
BEGIN
 SELECT * INTO reservation FROM bong.upload_reservations WHERE id=reservation_id FOR UPDATE;
 IF reservation.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 INSERT INTO bong.object_deletions(bucket,object_key,asset_id)
 SELECT 'media',key,(SELECT id FROM bong.media_assets WHERE id=reservation.id) FROM unnest(ARRAY[reservation.main_key,reservation.thumb_key]) key
 ON CONFLICT(bucket,object_key) DO UPDATE SET status='queued',attempts=0,next_attempt_at=now(),completed_at=NULL,lease_until=NULL,error_code=NULL,generation=bong.object_deletions.generation+1;
 UPDATE bong.media_assets SET state='quarantined',deleted_at=now() WHERE id=reservation.id;
 UPDATE bong.upload_reservations SET status='aborted',lease_until=NULL WHERE id=reservation.id;
END $$;

-- Leased jobs make interrupted external storage/provider calls retryable.
CREATE FUNCTION bong.maintenance_api(action text,p jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job bong.account_jobs; obj bong.object_deletions; rec record; result jsonb; objects jsonb; lim integer; subject uuid; err text;
BEGIN
 IF action='jobs.claim' THEN
  lim:=coalesce((p->>'limit')::integer,5); IF lim NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  FOR rec IN SELECT id FROM bong.upload_reservations WHERE status='reserved' AND lease_until<=now() LIMIT 200 LOOP PERFORM bong.abort_upload(rec.id); END LOOP;
  -- A cancelled exporter may have stored bytes just before its lease expired.
  -- Requeue even a previously completed delete acknowledgement exactly here.
  INSERT INTO bong.object_deletions(bucket,object_key) SELECT 'exports',id::text||'/export.json' FROM bong.account_jobs WHERE kind='export' AND phase='cancelled' AND status='processing' AND lease_until<now()
  ON CONFLICT(bucket,object_key) DO UPDATE SET status='queued',attempts=0,next_attempt_at=now(),completed_at=NULL,lease_until=NULL,generation=bong.object_deletions.generation+1;
  UPDATE bong.account_jobs SET status=CASE WHEN attempts>=10 OR phase='cancelled' THEN 'failed' ELSE 'retry' END,error_code='LEASE_EXPIRED',next_attempt_at=now(),lease_until=NULL WHERE status='processing' AND lease_until<now();
  UPDATE bong.account_jobs SET status='failed',error_code='ACCOUNT_DELETING' WHERE kind='export' AND phase='cancelled' AND status IN ('queued','retry');
  UPDATE bong.object_deletions SET status=CASE WHEN attempts>=10 THEN 'failed' ELSE 'retry' END,error_code='LEASE_EXPIRED',next_attempt_at=now(),lease_until=NULL WHERE status='processing' AND lease_until<now();
  WITH claim AS (SELECT id FROM bong.account_jobs WHERE status IN ('queued','retry') AND next_attempt_at<=now() AND attempts<10 ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT lim),
  updated AS (UPDATE bong.account_jobs j SET status='processing',attempts=attempts+1,lease_until=now()+interval '5 minutes',updated_at=now() FROM claim WHERE j.id=claim.id RETURNING j.*)
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'userId',coalesce(user_id,provider_subject),'kind',kind,'phase',phase,'attempts',attempts)),'[]'::jsonb) INTO result FROM updated;
  WITH claim AS (SELECT id FROM bong.object_deletions od WHERE status IN ('queued','retry') AND next_attempt_at<=now() AND attempts<10 AND NOT EXISTS(SELECT 1 FROM bong.upload_reservations ur WHERE ur.status='reserved' AND od.object_key IN(ur.main_key,ur.thumb_key)) ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT lim*8),
  updated AS (UPDATE bong.object_deletions o SET status='processing',attempts=attempts+1,lease_until=now()+interval '5 minutes' FROM claim WHERE o.id=claim.id RETURNING o.*)
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'bucket',bucket,'key',object_key,'attempts',attempts,'generation',generation)),'[]'::jsonb) INTO objects FROM updated;
  RETURN jsonb_build_object('jobs',result,'objects',objects);
 ELSIF action IN ('objects.complete','objects.retry') THEN
  SELECT * INTO obj FROM bong.object_deletions WHERE id=(p->>'id')::uuid FOR UPDATE;
  IF obj.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF (p->>'generation')::bigint IS DISTINCT FROM obj.generation THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  IF obj.status='complete' THEN RETURN jsonb_build_object('id',obj.id,'status','complete'); END IF;
  IF action='objects.complete' THEN
   UPDATE bong.object_deletions SET status='complete',lease_until=NULL,completed_at=now(),error_code=NULL WHERE id=obj.id;
   UPDATE bong.media_assets SET state='deleted',deleted_at=now() WHERE id=obj.asset_id AND NOT EXISTS(SELECT 1 FROM bong.object_deletions WHERE asset_id=obj.asset_id AND status<>'complete');
  ELSE
   err:=coalesce(p->>'errorCode','STORAGE_UNAVAILABLE'); IF err !~ '^[A-Z0-9_]{1,80}$' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   UPDATE bong.object_deletions SET status=CASE WHEN attempts>=10 THEN 'failed' ELSE 'retry' END,lease_until=NULL,error_code=err,next_attempt_at=now()+make_interval(secs=>least(3600,(power(2,least(attempts,10))*30)::integer)) WHERE id=obj.id;
  END IF;
  RETURN jsonb_build_object('id',obj.id,'status',(SELECT status FROM bong.object_deletions WHERE id=obj.id));
 ELSIF action IN ('jobs.export-data','jobs.complete','jobs.retry','deletion.prepare','deletion.complete') THEN
  SELECT * INTO job FROM bong.account_jobs WHERE id=(p->>'id')::uuid FOR UPDATE;
  IF job.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF job.status='complete' THEN RETURN jsonb_build_object('id',job.id,'status','complete'); END IF;
  subject:=coalesce(job.user_id,job.provider_subject);
  IF action='jobs.retry' THEN
   err:=coalesce(p->>'errorCode','DEPENDENCY_UNAVAILABLE'); IF err !~ '^[A-Z0-9_]{1,80}$' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   IF job.kind='export' AND (job.phase='cancelled' OR NOT EXISTS(SELECT 1 FROM bong.member_state WHERE user_id=subject AND state NOT IN ('deleting','deleted'))) THEN
    INSERT INTO bong.object_deletions(bucket,object_key) VALUES('exports',job.id::text||'/export.json') ON CONFLICT(bucket,object_key) DO UPDATE SET status='queued',attempts=0,next_attempt_at=now(),completed_at=NULL,lease_until=NULL,generation=bong.object_deletions.generation+1;
    UPDATE bong.account_jobs SET status='failed',phase='cancelled',error_code='ACCOUNT_DELETING',lease_until=NULL,updated_at=now() WHERE id=job.id;
   ELSE UPDATE bong.account_jobs SET status=CASE WHEN attempts>=10 THEN 'failed' ELSE 'retry' END,error_code=err,lease_until=NULL,updated_at=now(),next_attempt_at=now()+make_interval(secs=>least(3600,(power(2,least(attempts,10))*30)::integer)) WHERE id=job.id; END IF;
   RETURN jsonb_build_object('id',job.id,'status',(SELECT status FROM bong.account_jobs WHERE id=job.id));
  ELSIF action='jobs.export-data' THEN
   IF job.kind<>'export' OR job.user_id IS NULL OR job.phase='cancelled' OR NOT EXISTS(SELECT 1 FROM bong.member_state WHERE user_id=subject AND state NOT IN ('deleting','deleted')) THEN RAISE EXCEPTION 'CONFLICT'; END IF;
   RETURN jsonb_build_object('formatVersion',1,'exportedAt',now(),
    'profile',(SELECT jsonb_build_object('handle',handle,'displayName',display_name,'bio',bio,'joinedAt',created_at) FROM bong.members WHERE user_id=subject),
    'policyAcceptances',(SELECT jsonb_build_object('rulesVersion',rules_version,'termsVersion',terms_version,'acceptedAt',accepted_at,'adultAcknowledgedAt',adult_acknowledged_at) FROM bong.member_state WHERE user_id=subject),
    'posts',coalesce((SELECT jsonb_agg(jsonb_build_object('id',po.id,'kind',po.kind,'state',po.state,'createdAt',po.created_at,'revisions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'number',r.revision_number,'title',r.title,'body',r.body,'projectUrl',r.project_url,'sourceIdeaId',r.source_idea_id,'state',r.state,'authorReason',r.author_reason,'submittedAt',r.submitted_at) ORDER BY r.revision_number) FROM bong.post_revisions r WHERE r.post_id=po.id),'[]'::jsonb))) FROM bong.posts po WHERE author_id=subject),'[]'::jsonb),
    'comments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'postId',c.post_id,'state',c.state,'createdAt',c.created_at,'revisions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'number',r.revision_number,'body',r.body,'state',r.state,'authorReason',r.author_reason,'submittedAt',r.submitted_at) ORDER BY r.revision_number) FROM bong.comment_revisions r WHERE r.comment_id=c.id),'[]'::jsonb))) FROM bong.comments c WHERE author_id=subject),'[]'::jsonb),
    'mediaManifest',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'width',width,'height',height,'mime',mime,'sha256',digest,'state',state,'mainBytes',main_bytes,'thumbnailBytes',thumb_bytes,'authorizedDownloadPath','/api/media/'||id::text||'/main')) FROM bong.media_assets WHERE owner_id=subject),'[]'::jsonb));
  ELSIF action='jobs.complete' THEN
   IF job.kind<>'export' OR p->>'exportKey' IS DISTINCT FROM job.id::text||'/export.json' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   IF job.phase='cancelled' OR NOT EXISTS(SELECT 1 FROM bong.member_state WHERE user_id=subject AND state NOT IN ('deleting','deleted')) THEN
    INSERT INTO bong.object_deletions(bucket,object_key) VALUES('exports',job.id::text||'/export.json') ON CONFLICT(bucket,object_key) DO UPDATE SET status='queued',attempts=0,next_attempt_at=now(),completed_at=NULL,lease_until=NULL,generation=bong.object_deletions.generation+1;
    UPDATE bong.account_jobs SET status='failed',phase='cancelled',error_code='ACCOUNT_DELETING',lease_until=NULL,updated_at=now() WHERE id=job.id;
    RETURN jsonb_build_object('id',job.id,'status','failed');
   END IF;
   UPDATE bong.account_jobs SET status='complete',phase='ready',export_key=p->>'exportKey',expires_at=now()+interval '24 hours',completed_at=now(),updated_at=now(),lease_until=NULL,error_code=NULL WHERE id=job.id;
   RETURN jsonb_build_object('id',job.id,'status','complete');
  ELSIF action='deletion.prepare' THEN
   IF job.kind<>'deletion' THEN RAISE EXCEPTION 'CONFLICT'; END IF;
   PERFORM 1 FROM bong.upload_reservations WHERE owner_id=subject OR deletion_job_id=job.id FOR UPDATE;
   IF EXISTS(SELECT 1 FROM bong.upload_reservations WHERE (owner_id=subject OR deletion_job_id=job.id) AND status='reserved') THEN RAISE EXCEPTION 'UPLOAD_CLEANUP_PENDING'; END IF;
   IF EXISTS(SELECT 1 FROM bong.object_deletions od JOIN bong.upload_reservations ur ON od.object_key IN (ur.main_key,ur.thumb_key) WHERE (ur.owner_id=subject OR ur.deletion_job_id=job.id) AND od.status<>'complete') THEN RAISE EXCEPTION 'MEDIA_CLEANUP_PENDING'; END IF;
   IF job.phase='provider-deletion' THEN RETURN jsonb_build_object('userId',job.provider_subject,'readyForProviderDeletion',true); END IF;
   IF EXISTS(SELECT 1 FROM bong.retention_holds h WHERE expires_at>now() AND ((target_type='member' AND target_id=subject::text) OR (target_type='post' AND target_id IN (SELECT id::text FROM bong.posts WHERE author_id=subject)) OR (target_type='comment' AND target_id IN (SELECT id::text FROM bong.comments WHERE author_id=subject)) OR (target_type='asset' AND target_id IN (SELECT id::text FROM bong.media_assets WHERE owner_id=subject)))) THEN RAISE EXCEPTION 'RETENTION_HOLD'; END IF;
   IF EXISTS(SELECT 1 FROM bong.media_assets WHERE owner_id=subject AND state<>'deleted') THEN RAISE EXCEPTION 'MEDIA_CLEANUP_PENDING'; END IF;
   IF EXISTS(SELECT 1 FROM bong.object_deletions od JOIN bong.upload_reservations ur ON od.object_key IN (ur.main_key,ur.thumb_key) WHERE ur.owner_id=subject AND od.status<>'complete') THEN RAISE EXCEPTION 'MEDIA_CLEANUP_PENDING'; END IF;
   IF EXISTS(SELECT 1 FROM bong.account_jobs WHERE user_id=subject AND kind='export' AND status='processing') THEN RAISE EXCEPTION 'EXPORT_CLEANUP_PENDING'; END IF;
   -- External object cleanup commits before removing the member/provider identity.
   -- Queue exports at request acceptance; this guards every prior export too.
   IF EXISTS(SELECT 1 FROM bong.object_deletions od JOIN bong.account_jobs ej ON od.object_key=ej.id::text||'/export.json' WHERE ej.user_id=subject AND ej.kind='export' AND od.status<>'complete') THEN RAISE EXCEPTION 'MEDIA_CLEANUP_PENDING'; END IF;
   -- Save provider subject until external deletion succeeds; remove it on completion.
   UPDATE bong.account_jobs SET provider_subject=subject,phase='provider-deletion',updated_at=now() WHERE id=job.id;
   INSERT INTO bong.object_deletions(bucket,object_key) SELECT 'exports',export_key FROM bong.account_jobs WHERE user_id=subject AND export_key IS NOT NULL ON CONFLICT(bucket,object_key) DO NOTHING;
   UPDATE bong.posts SET approved_revision_id=NULL,latest_revision_id=NULL,search_vector=''::tsvector,state='deleted' WHERE author_id=subject;
   DELETE FROM bong.revision_assets WHERE revision_id IN (SELECT r.id FROM bong.post_revisions r JOIN bong.posts po ON po.id=r.post_id WHERE po.author_id=subject);
   DELETE FROM bong.post_revisions WHERE post_id IN (SELECT id FROM bong.posts WHERE author_id=subject);
   UPDATE bong.comments SET approved_revision_id=NULL,latest_revision_id=NULL,state='deleted' WHERE author_id=subject;
   DELETE FROM bong.comment_revisions WHERE comment_id IN (SELECT id FROM bong.comments WHERE author_id=subject);
   UPDATE bong.posts SET author_id=NULL WHERE author_id=subject;
   UPDATE bong.comments SET author_id=NULL WHERE author_id=subject;
   UPDATE bong.media_assets SET owner_id=NULL WHERE owner_id=subject;
   UPDATE bong.upload_reservations SET owner_id=NULL,session_id=NULL WHERE owner_id=subject;
   UPDATE bong.reports SET reporter_id=NULL WHERE reporter_id=subject;
   UPDATE bong.moderation_actions SET actor_id=NULL,session_id=NULL WHERE actor_id=subject;
   UPDATE bong.feature_settings SET actor_id=NULL WHERE actor_id=subject;
   DELETE FROM bong.idempotency_records WHERE actor_id=subject;
   DELETE FROM bong.app_sessions WHERE user_id=subject;
   DELETE FROM bong.staff_mfa_factors WHERE user_id=subject;
   DELETE FROM bong.staff_roles WHERE user_id=subject;
   DELETE FROM bong.member_state WHERE user_id=subject;
   UPDATE bong.account_jobs SET user_id=NULL,export_key=NULL WHERE user_id=subject;
   DELETE FROM bong.members WHERE user_id=subject;
   RETURN jsonb_build_object('userId',subject,'readyForProviderDeletion',true);
  ELSE
   IF job.kind<>'deletion' OR job.phase<>'provider-deletion' THEN RAISE EXCEPTION 'CONFLICT'; END IF;
   UPDATE bong.deletion_ledger SET provider_deleted_at=now() WHERE job_id=job.id;
   UPDATE bong.account_jobs SET provider_subject=NULL,status='complete',phase='complete',completed_at=now(),updated_at=now(),lease_until=NULL,error_code=NULL WHERE id=job.id;
   RETURN jsonb_build_object('id',job.id,'status','complete');
  END IF;
 ELSIF action='retention.run' THEN
  FOR rec IN SELECT id FROM bong.media_assets a WHERE (state='unattached' AND created_at<now()-interval '24 hours') AND NOT EXISTS(SELECT 1 FROM bong.retention_holds WHERE target_type='asset' AND target_id=a.id::text AND expires_at>now()) LIMIT 200 LOOP PERFORM bong.queue_media(rec.id); END LOOP;
  FOR rec IN SELECT id FROM bong.upload_reservations WHERE status='reserved' AND lease_until<=now() LIMIT 200 LOOP PERFORM bong.abort_upload(rec.id); END LOOP;
  DELETE FROM bong.upload_reservations ur WHERE (status='aborted' OR (status='complete' AND owner_id IS NULL)) AND created_at<now()-interval '30 days' AND NOT EXISTS(SELECT 1 FROM bong.object_deletions od WHERE od.object_key IN(ur.main_key,ur.thumb_key) AND od.status<>'complete');
  INSERT INTO bong.object_deletions(bucket,object_key) SELECT 'exports',export_key FROM bong.account_jobs WHERE export_key IS NOT NULL AND expires_at<=now() ON CONFLICT(bucket,object_key) DO NOTHING;
  INSERT INTO bong.object_deletions(bucket,object_key) SELECT 'exports',id::text||'/export.json' FROM bong.account_jobs WHERE kind='export' AND (status='failed' OR (status IN ('queued','retry') AND created_at<now()-interval '24 hours')) ON CONFLICT(bucket,object_key) DO NOTHING;
  UPDATE bong.account_jobs SET export_key=NULL,phase='expired' WHERE kind='export' AND export_key IS NOT NULL AND expires_at<=now();
  DELETE FROM bong.idempotency_records WHERE expires_at<=now(); DELETE FROM bong.rate_buckets WHERE expires_at<=now();
  DELETE FROM bong.operational_events WHERE created_at<now()-interval '30 days';
  DELETE FROM bong.moderation_actions WHERE created_at<now()-interval '180 days';
  DELETE FROM bong.app_sessions WHERE (revoked_at<now()-interval '30 days' OR expires_at<now()-interval '30 days');
  -- Content retention removes submitted bytes, while same-post reply tombstones survive.
  FOR rec IN SELECT po.id FROM bong.posts po WHERE po.state='deleted' AND po.deleted_at<now()-interval '30 days'
   AND NOT EXISTS(SELECT 1 FROM bong.retention_holds WHERE target_type='post' AND target_id=po.id::text AND expires_at>now()) LIMIT 200 LOOP
   UPDATE bong.posts SET approved_revision_id=NULL,latest_revision_id=NULL WHERE id=rec.id;
   DELETE FROM bong.revision_assets WHERE revision_id IN (SELECT id FROM bong.post_revisions WHERE post_id=rec.id);
   DELETE FROM bong.post_revisions WHERE post_id=rec.id;
  END LOOP;
  FOR rec IN SELECT c.id FROM bong.comments c WHERE c.state='deleted' AND c.deleted_at<now()-interval '30 days'
   AND NOT EXISTS(SELECT 1 FROM bong.retention_holds WHERE target_type='comment' AND target_id=c.id::text AND expires_at>now()) LIMIT 200 LOOP
   UPDATE bong.comments SET approved_revision_id=NULL,latest_revision_id=NULL WHERE id=rec.id; DELETE FROM bong.comment_revisions WHERE comment_id=rec.id;
  END LOOP;
  -- Rejected/superseded versions have no public pointer and no indefinite retention.
  FOR rec IN SELECT r.id,r.post_id FROM bong.post_revisions r JOIN bong.posts po ON po.id=r.post_id WHERE r.state IN ('rejected','superseded') AND r.submitted_at<now()-interval '30 days' AND r.id IS DISTINCT FROM po.approved_revision_id
   AND NOT EXISTS(SELECT 1 FROM bong.retention_holds WHERE target_type='post' AND target_id=po.id::text AND expires_at>now()) LIMIT 200 LOOP
   UPDATE bong.posts SET latest_revision_id=approved_revision_id WHERE id=rec.post_id AND latest_revision_id=rec.id;
   DELETE FROM bong.revision_assets WHERE revision_id=rec.id; DELETE FROM bong.post_revisions WHERE id=rec.id;
  END LOOP;
  FOR rec IN SELECT r.id,r.comment_id FROM bong.comment_revisions r JOIN bong.comments c ON c.id=r.comment_id WHERE r.state IN ('rejected','superseded') AND r.submitted_at<now()-interval '30 days' AND r.id IS DISTINCT FROM c.approved_revision_id
   AND NOT EXISTS(SELECT 1 FROM bong.retention_holds WHERE target_type='comment' AND target_id=c.id::text AND expires_at>now()) LIMIT 200 LOOP
   UPDATE bong.comments SET latest_revision_id=approved_revision_id WHERE id=rec.comment_id AND latest_revision_id=rec.id; DELETE FROM bong.comment_revisions WHERE id=rec.id;
  END LOOP;
  FOR rec IN SELECT a.id FROM bong.media_assets a WHERE a.state='attached' AND NOT EXISTS(SELECT 1 FROM bong.revision_assets ra WHERE ra.asset_id=a.id)
   AND NOT EXISTS(SELECT 1 FROM bong.retention_holds h WHERE h.target_type='asset' AND h.target_id=a.id::text AND h.expires_at>now()) LIMIT 200 LOOP PERFORM bong.queue_media(rec.id); END LOOP;
  RETURN jsonb_build_object('processed',true,'failedJobs',(SELECT count(*) FROM bong.account_jobs WHERE status='failed'),'failedObjects',(SELECT count(*) FROM bong.object_deletions WHERE status='failed'));
 ELSE RAISE EXCEPTION 'UNKNOWN_ACTION'; END IF;
END $$;

-- This function is NOT granted to runtime or maintenance. Owner tooling uses
-- a separately supplied migration credential after provider identity verification.
CREATE FUNCTION bong.owner_api(action text,p jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
<<owner_vars>>
DECLARE subject uuid; role_name text; reason text; item jsonb; count_rows integer;
BEGIN
 reason:=btrim(p->>'reason');
 IF action='catalog.sync' THEN
  IF jsonb_typeof(p->'ideas')<>'array' OR jsonb_array_length(p->'ideas')<>1000 THEN RAISE EXCEPTION 'CATALOG_COUNT'; END IF;
  IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p->'ideas'))<>1000 THEN RAISE EXCEPTION 'CATALOG_IDS'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p->'ideas') LOOP
   IF item->>'id' !~ '^BONG-[0-9]{4}$' OR substring(item->>'id' FROM 6)::integer NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'CATALOG_IDS'; END IF;
   INSERT INTO bong.idea_catalog(id,category_id,source_text_sha256,dataset_version,active) VALUES(item->>'id',item->>'categoryId',item->>'sourceTextSha256',item->>'datasetVersion',(item->>'active')::boolean)
   ON CONFLICT(id) DO UPDATE SET category_id=EXCLUDED.category_id,source_text_sha256=EXCLUDED.source_text_sha256,dataset_version=EXCLUDED.dataset_version,active=EXCLUDED.active;
  END LOOP; RETURN jsonb_build_object('count',1000);
 END IF;
 IF char_length(coalesce(reason,'')) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
 IF action='feature.configure' THEN
  UPDATE bong.feature_settings SET enabled=(p->>'enabled')::boolean,version=version+1,reason=owner_vars.reason,updated_at=now() WHERE name=p->>'name';
  IF NOT FOUND THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  INSERT INTO bong.moderation_actions(target_type,target_id,action,reason,request_id) VALUES('feature',p->>'name','owner-configure',reason,'owner-command');
  RETURN jsonb_build_object('configured',true);
 END IF;
 subject:=(p->>'userId')::uuid;
 IF NOT EXISTS(SELECT 1 FROM bong.members WHERE user_id=subject AND handle IS NOT NULL AND deleted_at IS NULL) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 IF action='staff.grant' THEN
  role_name:=p->>'role'; IF role_name NOT IN ('moderator','admin') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  PERFORM pg_advisory_xact_lock(82443982343);
  IF role_name<>'admin' AND EXISTS(SELECT 1 FROM bong.staff_roles WHERE user_id=subject AND role='admin' AND revoked_at IS NULL) AND (SELECT count(*) FROM bong.staff_roles WHERE role='admin' AND revoked_at IS NULL)<=1 THEN RAISE EXCEPTION 'LAST_ADMIN'; END IF;
  INSERT INTO bong.staff_roles(user_id,role,grant_reason,bootstrap_allowed) VALUES(subject,role_name,reason,p->>'factorId' IS NULL)
  ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role,grant_reason=EXCLUDED.grant_reason,revoked_at=NULL,bootstrap_allowed=EXCLUDED.bootstrap_allowed;
  IF p->>'factorId' IS NOT NULL THEN INSERT INTO bong.staff_mfa_factors(factor_id,user_id,status,approved_at,evidence) VALUES(p->>'factorId',subject,'approved',now(),'owner-bootstrap: '||reason); END IF;
 ELSIF action='staff.revoke' THEN
  PERFORM pg_advisory_xact_lock(82443982343);
  IF EXISTS(SELECT 1 FROM bong.staff_roles WHERE user_id=subject AND role='admin' AND revoked_at IS NULL) AND (SELECT count(*) FROM bong.staff_roles WHERE role='admin' AND revoked_at IS NULL)<=1 THEN RAISE EXCEPTION 'LAST_ADMIN'; END IF;
  UPDATE bong.staff_roles SET revoked_at=now(),bootstrap_allowed=false WHERE user_id=subject;
  UPDATE bong.app_sessions SET revoked_at=now() WHERE user_id=subject AND revoked_at IS NULL;
 ELSIF action='staff.recover' THEN
  IF NOT EXISTS(SELECT 1 FROM bong.staff_roles WHERE user_id=subject AND revoked_at IS NULL) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  UPDATE bong.staff_mfa_factors SET status='revoked',revoked_at=now() WHERE user_id=subject AND status<>'revoked';
  INSERT INTO bong.staff_mfa_factors(factor_id,user_id,status,approved_at,evidence) VALUES(p->>'factorId',subject,'approved',now(),'owner-recovery: '||reason);
  UPDATE bong.app_sessions SET revoked_at=now(),step_up_at=NULL WHERE user_id=subject AND revoked_at IS NULL;
  UPDATE bong.staff_roles SET bootstrap_allowed=false WHERE user_id=subject;
 ELSE RAISE EXCEPTION 'UNKNOWN_ACTION'; END IF;
 INSERT INTO bong.moderation_actions(target_type,target_id,action,reason,request_id) VALUES('member',subject::text,action,reason,'owner-command');
 RETURN jsonb_build_object('userId',subject,'action',action);
END $$;
CREATE POLICY public_members ON bong.members FOR SELECT TO bong_runtime USING(handle IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY visible_posts ON bong.posts FOR SELECT TO bong_runtime USING(bong.can_post(id));
CREATE POLICY visible_revisions ON bong.post_revisions FOR SELECT TO bong_runtime USING(bong.can_revision(id));
CREATE POLICY visible_comments ON bong.comments FOR SELECT TO bong_runtime USING(bong.can_comment(id));
CREATE POLICY visible_comment_revisions ON bong.comment_revisions FOR SELECT TO bong_runtime USING(bong.can_comment_revision(id));
CREATE POLICY visible_revision_assets ON bong.revision_assets FOR SELECT TO bong_runtime USING(bong.can_revision(revision_id));
GRANT SELECT(user_id,handle,display_name,bio,created_at) ON bong.members TO bong_runtime;
GRANT SELECT ON bong.posts,bong.post_revisions,bong.comments,bong.comment_revisions,bong.revision_assets TO bong_runtime;
GRANT EXECUTE ON FUNCTION bong.actor_id(),bong.session_id(),bong.session_live(),bong.active_member(),bong.staff_role(boolean),bong.can_post(uuid),bong.can_revision(uuid),bong.can_comment(uuid),bong.can_comment_revision(uuid) TO bong_runtime;

CREATE FUNCTION bong.immutable_revision() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF TG_TABLE_NAME='post_revisions' THEN
  IF ROW(NEW.post_id,NEW.revision_number,NEW.title,NEW.body,NEW.project_url,NEW.source_idea_id,NEW.submitted_at) IS DISTINCT FROM ROW(OLD.post_id,OLD.revision_number,OLD.title,OLD.body,OLD.project_url,OLD.source_idea_id,OLD.submitted_at) THEN RAISE EXCEPTION 'IMMUTABLE_REVISION'; END IF;
 ELSE
  IF ROW(NEW.comment_id,NEW.revision_number,NEW.body,NEW.submitted_at) IS DISTINCT FROM ROW(OLD.comment_id,OLD.revision_number,OLD.body,OLD.submitted_at) THEN RAISE EXCEPTION 'IMMUTABLE_REVISION'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER immutable_post_content BEFORE UPDATE ON bong.post_revisions FOR EACH ROW EXECUTE FUNCTION bong.immutable_revision();
CREATE TRIGGER immutable_comment_content BEFORE UPDATE ON bong.comment_revisions FOR EACH ROW EXECUTE FUNCTION bong.immutable_revision();
CREATE FUNCTION bong.asset_binding() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bong.media_assets a JOIN bong.posts p ON p.id=a.bound_post_id JOIN bong.post_revisions r ON r.post_id=p.id
 WHERE a.id=NEW.asset_id AND r.id=NEW.revision_id AND a.owner_id=p.author_id AND a.state='attached') THEN RAISE EXCEPTION 'ASSET_BINDING'; END IF; RETURN NEW; END $$;
CREATE TRIGGER enforce_asset_binding BEFORE INSERT OR UPDATE ON bong.revision_assets FOR EACH ROW EXECUTE FUNCTION bong.asset_binding();

CREATE FUNCTION bong.require_session() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT bong.session_live() THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
 UPDATE bong.app_sessions SET last_seen_at=now() WHERE session_id=bong.session_id();
END $$;
CREATE FUNCTION bong.require_write() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM bong.require_session(); IF NOT bong.active_member() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF NOT bong.flag('posting_enabled') THEN RAISE EXCEPTION 'READ_ONLY'; END IF;
END $$;
CREATE FUNCTION bong.require_staff(fresh boolean DEFAULT true, admin_only boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM bong.require_session(); IF bong.staff_role(fresh) IS NULL THEN RAISE EXCEPTION 'MFA_REQUIRED'; END IF;
 IF admin_only AND bong.staff_role(fresh)<>'admin' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
END $$;
CREATE FUNCTION bong.require_reauth() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM bong.require_session();
 IF NOT EXISTS(SELECT 1 FROM bong.app_sessions WHERE session_id=bong.session_id() AND reauthenticated_at>now()-interval '10 minutes') THEN RAISE EXCEPTION 'REAUTH_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM bong.staff_roles WHERE user_id=bong.actor_id() AND revoked_at IS NULL) THEN PERFORM bong.require_staff(); END IF;
END $$;
CREATE FUNCTION bong.consume(subject text, action_name text, maximum bigint, seconds integer, cost bigint DEFAULT 1) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE start_at timestamptz; used bigint;
BEGIN
 IF subject IS NULL OR subject !~ '^[a-f0-9]{64}$' OR char_length(action_name) NOT BETWEEN 1 AND 80 OR maximum<1 OR maximum>100000000 OR seconds<1 OR seconds>86400 OR cost<1 OR cost>maximum THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
 start_at:=to_timestamp(floor(extract(epoch FROM now())/seconds)*seconds);
 INSERT INTO bong.rate_buckets(subject_key,action,window_start,consumed,expires_at) VALUES(subject,action_name,start_at,cost,start_at+make_interval(secs=>seconds)+interval '48 hours')
 ON CONFLICT ON CONSTRAINT rate_buckets_pkey DO UPDATE SET consumed=bong.rate_buckets.consumed+EXCLUDED.consumed WHERE bong.rate_buckets.consumed+EXCLUDED.consumed<=maximum RETURNING consumed INTO used;
 IF used IS NULL THEN RAISE EXCEPTION USING MESSAGE='RATE_LIMITED',DETAIL=greatest(1,ceil(extract(epoch FROM start_at+make_interval(secs=>seconds)-now())))::text; END IF;
END $$;
CREATE FUNCTION bong.account_limit(action_name text, maximum bigint, seconds integer, cost bigint DEFAULT 1) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT bong.consume(nullif(current_setting('app.rate_subject',true),''),action_name,maximum,seconds,cost) $$;
CREATE FUNCTION bong.audit(target_type text,target_id text,action_name text,reason text,old_state text,new_state text,revision_id uuid DEFAULT NULL,private_note text DEFAULT NULL) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO bong.moderation_actions(actor_id,actor_role,session_id,target_type,target_id,action,reason,previous_state,new_state,revision_id,private_note,request_id)
 VALUES(bong.actor_id(),bong.staff_role(),bong.session_id(),target_type,target_id,action_name,reason,old_state,new_state,revision_id,private_note,coalesce(nullif(current_setting('app.request_id',true),''),'maintenance')) $$;
CREATE FUNCTION bong.publish_post(post_key uuid,revision_key uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 UPDATE bong.post_revisions SET state='superseded' WHERE post_id=post_key AND state='approved' AND id<>revision_key;
 UPDATE bong.post_revisions SET state='approved' WHERE id=revision_key AND post_id=post_key;
 UPDATE bong.posts SET state='published',approved_revision_id=revision_key,published_at=coalesce(published_at,now()),hidden_at=NULL,deleted_at=NULL,
 search_vector=(SELECT to_tsvector('english',title||' '||body) FROM bong.post_revisions WHERE id=revision_key) WHERE id=post_key;
END $$;
CREATE FUNCTION bong.publish_comment(comment_key uuid,revision_key uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 UPDATE bong.comment_revisions SET state='superseded' WHERE comment_id=comment_key AND state='approved' AND id<>revision_key;
 UPDATE bong.comment_revisions SET state='approved' WHERE id=revision_key AND comment_id=comment_key;
 UPDATE bong.comments SET state='published',approved_revision_id=revision_key,deleted_at=NULL WHERE id=comment_key;
END $$;
CREATE FUNCTION bong.queue_media(asset_key uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 INSERT INTO bong.object_deletions(bucket,object_key,asset_id) SELECT 'media',main_key,id FROM bong.media_assets WHERE id=asset_key ON CONFLICT(bucket,object_key) DO NOTHING;
 INSERT INTO bong.object_deletions(bucket,object_key,asset_id) SELECT 'media',thumb_key,id FROM bong.media_assets WHERE id=asset_key ON CONFLICT(bucket,object_key) DO NOTHING;
 UPDATE bong.media_assets SET state='quarantined',deleted_at=now() WHERE id=asset_key AND state<>'deleted';
END $$;

CREATE FUNCTION bong.post_dto(post_key uuid,force_public boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p bong.posts; r bong.post_revisions; result jsonb; privileged boolean;
BEGIN
 SELECT * INTO p FROM bong.posts WHERE id=post_key;
 IF p.id IS NULL OR (force_public AND p.state<>'published') OR (NOT force_public AND NOT bong.can_post(p.id)) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 privileged:=NOT force_public AND ((bong.session_live() AND p.author_id=bong.actor_id()) OR bong.staff_role() IS NOT NULL);
 SELECT * INTO r FROM bong.post_revisions WHERE id=CASE WHEN p.state='published' THEN p.approved_revision_id WHEN privileged THEN p.latest_revision_id ELSE NULL END;
 result:=jsonb_build_object('id',p.id,'kind',p.kind,'state',p.state,'version',p.version,'revisionId',r.id,'title',r.title,'body',r.body,'projectUrl',r.project_url,'sourceIdeaId',r.source_idea_id,'createdAt',p.created_at,'publishedAt',p.published_at,'updatedAt',p.updated_at,
 'authorId',p.author_id,'handle',(SELECT handle FROM bong.members WHERE user_id=p.author_id),'displayName',(SELECT display_name FROM bong.members WHERE user_id=p.author_id),
 'author',(SELECT jsonb_build_object('id',m.user_id,'handle',m.handle,'displayName',m.display_name) FROM bong.members m WHERE m.user_id=p.author_id),
 'commentCount',(SELECT count(*) FROM bong.comments c WHERE c.post_id=p.id AND c.state='published' AND p.state='published'),
 'assets',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'altText',ra.alt_text,'width',a.width,'height',a.height) ORDER BY ra.position) FROM bong.revision_assets ra JOIN bong.media_assets a ON a.id=ra.asset_id WHERE ra.revision_id=r.id AND a.state='attached'),'[]'::jsonb));
 IF privileged THEN result:=result||jsonb_build_object('latestRevision',(SELECT jsonb_build_object('id',x.id,'title',x.title,'body',x.body,'projectUrl',x.project_url,'sourceIdeaId',x.source_idea_id,'state',x.state,'authorReason',x.author_reason,'assets',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'altText',ra.alt_text,'width',a.width,'height',a.height) ORDER BY ra.position) FROM bong.revision_assets ra JOIN bong.media_assets a ON a.id=ra.asset_id WHERE ra.revision_id=x.id AND a.state='attached'),'[]'::jsonb)) FROM bong.post_revisions x WHERE x.id=p.latest_revision_id)); END IF;
 IF privileged AND result->'latestRevision'->>'state'='pending' THEN result:=result||jsonb_build_object('pendingRevision',result->'latestRevision'); END IF;
 RETURN result;
END $$;
CREATE FUNCTION bong.comment_dto(comment_key uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',c.id,'postId',c.post_id,'state',c.state,'version',c.version,'createdAt',c.created_at,'replyToCommentId',c.reply_to_comment_id,
 'authorId',c.author_id,'handle',(SELECT handle FROM bong.members WHERE user_id=c.author_id),'displayName',(SELECT display_name FROM bong.members WHERE user_id=c.author_id),
 'replyToHandle',(SELECT m.handle FROM bong.comments rc JOIN bong.members m ON m.user_id=rc.author_id WHERE rc.id=c.reply_to_comment_id),
 'body',CASE WHEN c.state='deleted' THEN NULL ELSE r.body END,'revisionId',r.id,
 'author',(SELECT jsonb_build_object('id',m.user_id,'handle',m.handle,'displayName',m.display_name) FROM bong.members m WHERE m.user_id=c.author_id),
 'authorReason',CASE WHEN bong.session_live() AND c.author_id=bong.actor_id() THEN r.author_reason ELSE NULL END,
 'latestRevision',CASE WHEN (bong.session_live() AND c.author_id=bong.actor_id()) OR bong.staff_role() IS NOT NULL THEN (SELECT jsonb_build_object('id',cr.id,'body',cr.body,'state',cr.state,'authorReason',cr.author_reason) FROM bong.comment_revisions cr WHERE cr.id=c.latest_revision_id) ELSE NULL END)
 FROM bong.comments c LEFT JOIN bong.comment_revisions r ON r.id=CASE WHEN c.state='published' THEN c.approved_revision_id WHEN c.state<>'deleted' THEN c.latest_revision_id ELSE NULL END WHERE c.id=comment_key AND bong.can_comment(c.id) $$;

CREATE FUNCTION bong.pack_cursor(value jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT rtrim(translate(replace(encode(convert_to(value::text,'UTF8'),'base64'),E'\n',''),'+/','-_'),'=') $$;
CREATE FUNCTION bong.unpack_cursor(value text) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$ BEGIN
 IF value IS NULL OR value='' THEN RETURN NULL; END IF;
 IF char_length(value)>2000 OR value !~ '^[A-Za-z0-9_-]+$' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
 RETURN convert_from(decode(translate(value,'-_','+/')||repeat('=',(4-length(value)%4)%4),'base64'),'UTF8')::jsonb;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'VALIDATION_ERROR';
END $$;

-- One explicit dispatch boundary; payload values never become identifiers or SQL.
CREATE FUNCTION bong.api(action text,p jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
<<vars>>
DECLARE
 uid uuid:=bong.actor_id(); sid uuid:=bong.session_id(); key_id uuid; revision_id uuid; result jsonb;
 member_row bong.members; state_row bong.member_state; session_row bong.app_sessions;
 post_row bong.posts; comment_row bong.comments; revision_row bong.post_revisions; report_row bong.reports;
 job_row bong.account_jobs; asset_row bong.media_assets; factor_row bong.staff_mfa_factors; role_row bong.staff_roles;
 revision_no integer; expected integer; auto_publish boolean; asset jsonb; pos integer; lim integer;
 cur jsonb; snapshot_at timestamptz; before_at timestamptz; before_id uuid; search_text text; kind_filter text;
 rows_json jsonb; last_row jsonb; has_more boolean; next_cursor text; content_hash text; idem bong.idempotency_records;
 action_name text; reason text; old_state text; rec record; feature_row bong.feature_settings;
BEGIN
 IF jsonb_typeof(p)<>'object' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
 IF action='session.register' THEN
  IF uid IS NULL OR sid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM bong.members WHERE user_id=uid) AND (NOT bong.flag('registrations_enabled') OR NOT coalesce((p->>'registrationsEnabled')::boolean,false)) THEN RAISE EXCEPTION 'REGISTRATION_CLOSED'; END IF;
  INSERT INTO bong.members(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
  INSERT INTO bong.member_state(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
  IF EXISTS(SELECT 1 FROM bong.member_state WHERE user_id=uid AND state IN ('deleting','deleted')) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  INSERT INTO bong.app_sessions(session_id,user_id,registration_request_id,reauthenticated_at) VALUES(sid,uid,coalesce(current_setting('app.request_id',true),'unavailable'),now()) ON CONFLICT(session_id) DO NOTHING;
  IF NOT bong.session_live() THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  RETURN bong.api('session.get');
 ELSIF action='session.get' THEN
  IF NOT bong.session_live() THEN RETURN jsonb_build_object('userId',NULL,'sessionId',NULL,'onboarded',false,'member',NULL,'staffRole',NULL,'approvedFactorIds','[]'::jsonb); END IF;
  UPDATE bong.app_sessions SET last_seen_at=now() WHERE session_id=sid AND last_seen_at<now()-interval '15 minutes';
  SELECT * INTO member_row FROM bong.members WHERE user_id=uid;
  SELECT * INTO state_row FROM bong.member_state WHERE user_id=uid;
  SELECT * INTO session_row FROM bong.app_sessions WHERE session_id=sid;
  RETURN jsonb_build_object('userId',uid,'sessionId',sid,'onboarded',member_row.handle IS NOT NULL AND state_row.accepted_at IS NOT NULL,
   'member',jsonb_build_object('handle',member_row.handle,'displayName',member_row.display_name,'bio',member_row.bio,'version',member_row.version,'state',CASE WHEN state_row.state='suspended' AND state_row.suspension_until<=now() THEN 'active' ELSE state_row.state END,'trustedText',state_row.trusted_text,'stateReason',state_row.state_reason,'suspensionUntil',state_row.suspension_until),
   'staffRole',(SELECT role FROM bong.staff_roles WHERE user_id=uid AND revoked_at IS NULL),
   'approvedFactorIds',coalesce((SELECT jsonb_agg(factor_id) FROM bong.staff_mfa_factors WHERE user_id=uid AND status='approved'),'[]'::jsonb),
   'stepUpAt',session_row.step_up_at,'mfaFactorId',session_row.factor_id,'reauthenticatedAt',session_row.reauthenticated_at,
   'features',(SELECT jsonb_object_agg(name,enabled) FROM bong.feature_settings));
 ELSIF action='feature.get' THEN
  RETURN (SELECT jsonb_object_agg(name,enabled) FROM bong.feature_settings);
 ELSIF action='health.ready' THEN RETURN jsonb_build_object('schemaVersion','202609270001','ready',true);
 ELSIF action='session.reauthenticate' THEN
  PERFORM bong.require_session(); UPDATE bong.app_sessions SET reauthenticated_at=now() WHERE session_id=sid; RETURN jsonb_build_object('reauthenticatedAt',now());
 ELSIF action='session.revoke' THEN
  PERFORM bong.require_session(); IF coalesce((p->>'all')::boolean,false) THEN PERFORM bong.require_reauth(); END IF;
  UPDATE bong.app_sessions SET revoked_at=now() WHERE user_id=uid AND (coalesce((p->>'all')::boolean,false) OR session_id=sid) AND revoked_at IS NULL;
  RETURN jsonb_build_object('revoked',true);
 ELSIF action='session.stepup' THEN
  PERFORM bong.require_session();
  IF current_setting('app.actor_aal',true)<>'aal2' OR NOT EXISTS(SELECT 1 FROM bong.staff_mfa_factors f JOIN bong.staff_roles r ON r.user_id=f.user_id WHERE f.factor_id=p->>'factorId' AND f.user_id=uid AND f.status='approved' AND r.revoked_at IS NULL) THEN RAISE EXCEPTION 'MFA_REQUIRED'; END IF;
  UPDATE bong.app_sessions SET step_up_at=now(),factor_id=p->>'factorId' WHERE session_id=sid;
  RETURN jsonb_build_object('stepUpAt',now());
 ELSIF action='factor.verify-allowed' THEN
  PERFORM bong.require_session();
  IF NOT EXISTS(SELECT 1 FROM bong.staff_mfa_factors f JOIN bong.staff_roles sr ON sr.user_id=f.user_id WHERE f.user_id=uid AND f.factor_id=p->>'factorId' AND sr.revoked_at IS NULL AND (f.status='approved' OR (f.status='pending' AND (sr.bootstrap_allowed OR bong.staff_role(true) IS NOT NULL)))) THEN RAISE EXCEPTION 'MFA_REQUIRED'; END IF;
  RETURN jsonb_build_object('allowed',true);
 ELSIF action IN ('factor.enroll-allowed','factor.pending','factor.approve') THEN
  PERFORM bong.require_session(); SELECT * INTO role_row FROM bong.staff_roles WHERE user_id=uid AND revoked_at IS NULL FOR UPDATE;
  IF role_row.user_id IS NULL OR NOT bong.active_member() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF NOT role_row.bootstrap_allowed THEN PERFORM bong.require_staff(); END IF;
  IF action='factor.enroll-allowed' THEN RETURN jsonb_build_object('allowed',true,'bootstrap',role_row.bootstrap_allowed); END IF;
  IF action='factor.pending' THEN
   IF EXISTS(SELECT 1 FROM bong.staff_mfa_factors WHERE user_id=uid AND status='pending') THEN RAISE EXCEPTION 'CONFLICT'; END IF;
   INSERT INTO bong.staff_mfa_factors(factor_id,user_id,status,evidence) VALUES(p->>'factorId',uid,'pending',CASE WHEN role_row.bootstrap_allowed THEN 'owner-approved-bootstrap' ELSE 'existing-approved-factor' END);
   RETURN jsonb_build_object('factorId',p->>'factorId','status','pending');
  END IF;
  IF current_setting('app.actor_aal',true)<>'aal2' THEN RAISE EXCEPTION 'MFA_REQUIRED'; END IF;
  SELECT * INTO factor_row FROM bong.staff_mfa_factors WHERE factor_id=p->>'factorId' AND user_id=uid AND status='pending' FOR UPDATE;
  IF factor_row.factor_id IS NULL THEN RAISE EXCEPTION 'MFA_REQUIRED'; END IF;
  UPDATE bong.staff_mfa_factors SET status='approved',approved_at=now() WHERE factor_id=factor_row.factor_id;
  UPDATE bong.staff_roles SET bootstrap_allowed=false WHERE user_id=uid;
  PERFORM bong.audit('member',uid::text,'factor-approved','Verified approved enrollment',NULL,'approved');
  RETURN jsonb_build_object('factorId',factor_row.factor_id,'status','approved');
 ELSIF action='onboarding' THEN
  PERFORM bong.require_session(); SELECT * INTO member_row FROM bong.members WHERE user_id=uid FOR UPDATE;
  IF NOT bong.flag('registrations_enabled') THEN RAISE EXCEPTION 'REGISTRATION_CLOSED'; END IF;
  IF member_row.handle IS NOT NULL THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  IF p->>'handle' IS NULL OR p->>'handle' !~ '^[a-z0-9][a-z0-9_]{2,23}$' OR p->>'handle'=ANY(ARRAY['admin','administrator','moderator','support','security','bong','official','team','api','account','board','members','sign_in','onboarding','privacy','terms','contact','accessibility','about','through_time','timeline','moderation','idea','system','root'])
   OR coalesce((p->>'adultAcknowledged')::boolean,false)=false OR char_length(coalesce(p->>'rulesVersion','')) NOT BETWEEN 1 AND 100 OR char_length(coalesce(p->>'termsVersion','')) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF EXISTS(SELECT 1 FROM bong.member_state WHERE user_id=uid AND state<>'active') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE bong.members SET handle=p->>'handle',display_name=coalesce(nullif(btrim(p->>'displayName'),''),p->>'handle'),updated_at=now() WHERE user_id=uid;
  UPDATE bong.member_state SET rules_version=p->>'rulesVersion',terms_version=p->>'termsVersion',accepted_at=now(),adult_acknowledged_at=now() WHERE user_id=uid;
  RETURN bong.api('session.get');
 ELSIF action='profile.update' THEN
  PERFORM bong.require_write(); PERFORM bong.account_limit('profile',10,3600);
  UPDATE bong.members SET display_name=btrim(p->>'displayName'),bio=coalesce(p->>'bio',''),version=version+1,updated_at=now() WHERE user_id=uid AND version=(p->>'expectedVersion')::integer RETURNING * INTO member_row;
  IF member_row.user_id IS NULL THEN RAISE EXCEPTION 'CONFLICT'; END IF; RETURN bong.api('session.get');
 ELSIF action='limit.consume' THEN
  PERFORM bong.consume(p->>'subjectKey',p->>'action',(p->>'limit')::bigint,(p->>'windowSeconds')::integer,coalesce((p->>'cost')::bigint,1)); RETURN jsonb_build_object('allowed',true);
 ELSIF action='limit.cooldown' THEN
  IF p->>'subjectKey' !~ '^[a-f0-9]{64}$' OR char_length(p->>'action') NOT BETWEEN 1 AND 80 OR (p->>'seconds')::integer NOT BETWEEN 1 AND 86400 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  key_id:=NULL;
  INSERT INTO bong.rate_buckets(subject_key,action,window_start,consumed,expires_at) VALUES(p->>'subjectKey','cooldown:'||(p->>'action'),'epoch'::timestamptz,1,now()+make_interval(secs=>(p->>'seconds')::integer))
  ON CONFLICT ON CONSTRAINT rate_buckets_pkey DO UPDATE SET consumed=bong.rate_buckets.consumed+1,expires_at=EXCLUDED.expires_at WHERE bong.rate_buckets.expires_at<=now() RETURNING consumed INTO expected;
  IF expected IS NULL THEN
   SELECT expires_at INTO before_at FROM bong.rate_buckets WHERE subject_key=p->>'subjectKey' AND rate_buckets.action='cooldown:'||(p->>'action') AND window_start='epoch'::timestamptz;
   RAISE EXCEPTION USING MESSAGE='RATE_LIMITED',DETAIL=greatest(1,ceil(extract(epoch FROM before_at-now())))::text;
  END IF; RETURN jsonb_build_object('allowed',true);
 ELSIF action='post.list' THEN
  lim:=coalesce((p->>'limit')::integer,20); IF lim NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  kind_filter:=nullif(p->>'kind',''); IF kind_filter IS NOT NULL AND kind_filter NOT IN ('hear_me_out','made_this','all') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF; IF kind_filter='all' THEN kind_filter:=NULL; END IF;
  search_text:=nullif(btrim(p->>'query'),''); IF search_text IS NOT NULL AND char_length(search_text) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  cur:=bong.unpack_cursor(p->>'cursor'); snapshot_at:=coalesce((cur->>'snapshot')::timestamptz,now()); before_at:=(cur->>'at')::timestamptz; before_id:=(cur->>'id')::uuid;
  IF cur IS NOT NULL AND (cur->>'type' IS DISTINCT FROM 'posts' OR cur->>'kind' IS DISTINCT FROM kind_filter OR cur->>'query' IS DISTINCT FROM search_text OR before_at IS NULL OR before_id IS NULL OR snapshot_at>now()) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  SELECT coalesce(jsonb_agg(bong.post_dto(x.id,true) ORDER BY x.published_at DESC,x.id DESC),'[]'::jsonb) INTO rows_json FROM
   (SELECT po.id,po.published_at FROM bong.posts po JOIN bong.post_revisions r ON r.id=po.approved_revision_id WHERE po.state='published' AND po.published_at<=snapshot_at AND (kind_filter IS NULL OR po.kind=kind_filter)
   AND (before_at IS NULL OR (po.published_at,po.id)<(before_at,before_id))
   AND (search_text IS NULL OR po.search_vector @@ plainto_tsquery('english',search_text) OR (char_length(search_text)<=3 AND strpos(lower(r.title||' '||r.body),lower(search_text))>0)) ORDER BY po.published_at DESC,po.id DESC LIMIT lim+1) x;
  has_more:=jsonb_array_length(rows_json)>lim; IF has_more THEN rows_json:=rows_json-lim; last_row:=rows_json->(lim-1); next_cursor:=bong.pack_cursor(jsonb_build_object('type','posts','snapshot',snapshot_at,'at',last_row->>'publishedAt','id',last_row->>'id','kind',kind_filter,'query',search_text)); END IF;
  RETURN jsonb_build_object('items',rows_json,'posts',rows_json,'nextCursor',next_cursor,'page',jsonb_build_object('nextCursor',next_cursor,'hasMore',has_more));
 ELSIF action='post.get' THEN RETURN bong.post_dto((p->>'id')::uuid);
 ELSIF action IN ('post.create','post.edit') THEN
  PERFORM bong.require_write();
  content_hash:=encode(sha256(convert_to((p-'idempotencyKey'-'requestHash'-'reviewAll')::text,'UTF8')),'hex');
  IF action='post.create' THEN
   IF char_length(coalesce(p->>'idempotencyKey','')) NOT BETWEEN 8 AND 128 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||action||(p->>'idempotencyKey'),0));
   SELECT * INTO idem FROM bong.idempotency_records WHERE actor_id=uid AND idempotency_records.action=api.action AND key=p->>'idempotencyKey' AND expires_at>now();
   IF idem.actor_id IS NOT NULL THEN IF idem.request_hash<>content_hash THEN RAISE EXCEPTION 'CONFLICT'; END IF; RETURN idem.result; END IF;
  END IF;
  IF jsonb_typeof(coalesce(p->'assets','[]'::jsonb))<>'array' OR jsonb_array_length(coalesce(p->'assets','[]'::jsonb))>4 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF jsonb_array_length(coalesce(p->'assets','[]'::jsonb))>0 AND NOT bong.flag('uploads_enabled') THEN RAISE EXCEPTION 'READ_ONLY'; END IF;
  IF action='post.create' THEN
   PERFORM bong.account_limit('post-10m',3,600); PERFORM bong.account_limit('post-day',10,86400);
   INSERT INTO bong.posts(author_id,kind) VALUES(uid,p->>'kind') RETURNING * INTO post_row;
  ELSE
   SELECT * INTO post_row FROM bong.posts WHERE id=(p->>'id')::uuid AND author_id=uid FOR UPDATE;
   IF post_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
   IF post_row.state IN ('hidden','deleted') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
   IF post_row.version<>(p->>'expectedVersion')::integer THEN RAISE EXCEPTION 'CONFLICT'; END IF;
   IF p ? 'kind' AND p->>'kind'<>post_row.kind THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   PERFORM bong.account_limit('post-edit',10,3600);
   UPDATE bong.post_revisions SET state='superseded' WHERE post_id=post_row.id AND state='pending';
   UPDATE bong.posts SET version=version+1,updated_at=now() WHERE id=post_row.id RETURNING * INTO post_row;
  END IF;
  SELECT coalesce(max(revision_number),0)+1 INTO revision_no FROM bong.post_revisions WHERE post_id=post_row.id;
  INSERT INTO bong.post_revisions(post_id,revision_number,title,body,project_url,source_idea_id) VALUES(post_row.id,revision_no,btrim(p->>'title'),btrim(p->>'body'),nullif(p->>'projectUrl',''),nullif(p->>'sourceIdeaId','')) RETURNING id INTO revision_id;
  pos:=0;
  FOR asset IN SELECT value FROM jsonb_array_elements(coalesce(p->'assets','[]'::jsonb)) LOOP
   SELECT * INTO asset_row FROM bong.media_assets WHERE id=(asset->>'id')::uuid FOR UPDATE;
   IF asset_row.id IS NULL OR asset_row.owner_id<>uid OR asset_row.state NOT IN ('unattached','attached') OR (asset_row.bound_post_id IS NOT NULL AND asset_row.bound_post_id<>post_row.id) THEN RAISE EXCEPTION 'ASSET_BINDING'; END IF;
   UPDATE bong.media_assets SET state='attached',bound_post_id=post_row.id WHERE id=asset_row.id;
   INSERT INTO bong.revision_assets(revision_id,asset_id,position,alt_text) VALUES(revision_id,asset_row.id,pos,asset->>'altText'); pos:=pos+1;
  END LOOP;
  UPDATE bong.posts SET latest_revision_id=revision_id WHERE id=post_row.id;
  auto_publish:=NOT bong.flag('review_everything') AND NOT coalesce((p->>'reviewAll')::boolean,false) AND pos=0 AND ((SELECT trusted_text FROM bong.member_state WHERE user_id=uid) OR bong.staff_role(true) IS NOT NULL);
  IF auto_publish THEN PERFORM bong.publish_post(post_row.id,revision_id); END IF;
  result:=jsonb_build_object('id',post_row.id,'revisionId',revision_id,'state',CASE WHEN auto_publish THEN 'published' ELSE 'pending' END,'version',post_row.version);
  IF action='post.create' THEN INSERT INTO bong.idempotency_records(actor_id,action,key,request_hash,result) VALUES(uid,action,p->>'idempotencyKey',content_hash,result); END IF;
  RETURN result;
 ELSIF action='post.delete' THEN
  PERFORM bong.require_write(); SELECT * INTO post_row FROM bong.posts WHERE id=(p->>'id')::uuid AND author_id=uid FOR UPDATE;
  IF post_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF; IF post_row.version<>(p->>'expectedVersion')::integer THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  UPDATE bong.posts SET state='deleted',deleted_at=now(),updated_at=now(),version=version+1,search_vector=''::tsvector WHERE id=post_row.id;
  FOR rec IN SELECT id FROM bong.media_assets WHERE bound_post_id=post_row.id LOOP PERFORM bong.queue_media(rec.id); END LOOP;
  PERFORM bong.audit('post',post_row.id::text,'author-delete','Author requested deletion',post_row.state,'deleted'); RETURN jsonb_build_object('id',post_row.id,'state','deleted','version',post_row.version+1);
 ELSIF action='comment.list' THEN
  key_id:=(p->>'postId')::uuid; IF NOT bong.can_post(key_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  lim:=coalesce((p->>'limit')::integer,30); IF lim NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  cur:=bong.unpack_cursor(p->>'cursor'); before_at:=(cur->>'at')::timestamptz; before_id:=(cur->>'id')::uuid; snapshot_at:=coalesce((cur->>'snapshot')::timestamptz,now());
  IF cur IS NOT NULL AND (cur->>'type' IS DISTINCT FROM 'comments' OR cur->>'postId' IS DISTINCT FROM key_id::text OR before_at IS NULL OR before_id IS NULL) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  SELECT coalesce(jsonb_agg(bong.comment_dto(x.id) ORDER BY x.created_at,x.id),'[]'::jsonb) INTO rows_json FROM
   (SELECT c.id,c.created_at FROM bong.comments c WHERE c.post_id=key_id AND c.created_at<=snapshot_at AND bong.can_comment(c.id) AND (before_at IS NULL OR (c.created_at,c.id)>(before_at,before_id)) ORDER BY c.created_at,c.id LIMIT lim+1) x;
  has_more:=jsonb_array_length(rows_json)>lim; IF has_more THEN rows_json:=rows_json-lim; last_row:=rows_json->(lim-1); next_cursor:=bong.pack_cursor(jsonb_build_object('type','comments','postId',key_id,'snapshot',snapshot_at,'at',last_row->>'createdAt','id',last_row->>'id')); END IF;
  RETURN jsonb_build_object('items',rows_json,'comments',rows_json,'nextCursor',next_cursor,'page',jsonb_build_object('nextCursor',next_cursor,'hasMore',has_more));
 ELSIF action IN ('comment.create','comment.edit') THEN
  PERFORM bong.require_write();
  IF action='comment.create' THEN
   content_hash:=encode(sha256(convert_to((p-'idempotencyKey'-'requestHash'-'reviewAll')::text,'UTF8')),'hex');
   IF char_length(coalesce(p->>'idempotencyKey','')) NOT BETWEEN 8 AND 128 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||action||(p->>'idempotencyKey'),0));
   SELECT * INTO idem FROM bong.idempotency_records WHERE actor_id=uid AND idempotency_records.action=api.action AND key=p->>'idempotencyKey' AND expires_at>now();
   IF idem.actor_id IS NOT NULL THEN IF idem.request_hash<>content_hash THEN RAISE EXCEPTION 'CONFLICT'; END IF; RETURN idem.result; END IF;
   SELECT * INTO post_row FROM bong.posts WHERE id=(p->>'postId')::uuid AND state='published' FOR SHARE;
   IF post_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
   auto_publish:=NOT bong.flag('review_everything') AND NOT coalesce((p->>'reviewAll')::boolean,false) AND ((SELECT trusted_text FROM bong.member_state WHERE user_id=uid) OR bong.staff_role(true) IS NOT NULL);
   PERFORM bong.account_limit('comment-10m',CASE WHEN (SELECT trusted_text FROM bong.member_state WHERE user_id=uid) THEN 10 ELSE 3 END,600);
   PERFORM bong.account_limit('comment-day',CASE WHEN (SELECT trusted_text FROM bong.member_state WHERE user_id=uid) THEN 100 ELSE 20 END,86400);
   IF p->>'replyToCommentId' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM bong.comments WHERE id=(p->>'replyToCommentId')::uuid AND post_id=post_row.id AND state IN ('published','deleted')) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   INSERT INTO bong.comments(post_id,author_id,reply_to_comment_id) VALUES(post_row.id,uid,(p->>'replyToCommentId')::uuid) RETURNING * INTO comment_row;
  ELSE
   SELECT * INTO comment_row FROM bong.comments WHERE id=(p->>'id')::uuid AND author_id=uid FOR UPDATE;
   IF comment_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
   IF comment_row.version<>(p->>'expectedVersion')::integer THEN RAISE EXCEPTION 'CONFLICT'; END IF;
   IF comment_row.created_at<=now()-interval '15 minutes' OR comment_row.state IN ('hidden','deleted') OR NOT EXISTS(SELECT 1 FROM bong.posts WHERE id=comment_row.post_id AND state='published') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
   PERFORM bong.account_limit('comment-edit',10,3600);
   UPDATE bong.comment_revisions SET state='superseded' WHERE comment_id=comment_row.id AND state='pending';
   UPDATE bong.comments SET version=version+1,updated_at=now() WHERE id=comment_row.id RETURNING * INTO comment_row;
   auto_publish:=NOT bong.flag('review_everything') AND NOT coalesce((p->>'reviewAll')::boolean,false) AND ((SELECT trusted_text FROM bong.member_state WHERE user_id=uid) OR bong.staff_role(true) IS NOT NULL);
  END IF;
  SELECT coalesce(max(revision_number),0)+1 INTO revision_no FROM bong.comment_revisions WHERE comment_id=comment_row.id;
  INSERT INTO bong.comment_revisions(comment_id,revision_number,body) VALUES(comment_row.id,revision_no,btrim(p->>'body')) RETURNING id INTO revision_id;
  UPDATE bong.comments SET latest_revision_id=revision_id WHERE id=comment_row.id;
  IF auto_publish THEN PERFORM bong.publish_comment(comment_row.id,revision_id); END IF;
  result:=jsonb_build_object('id',comment_row.id,'revisionId',revision_id,'state',CASE WHEN auto_publish THEN 'published' ELSE 'pending' END,'version',comment_row.version);
  IF action='comment.create' THEN INSERT INTO bong.idempotency_records(actor_id,action,key,request_hash,result) VALUES(uid,action,p->>'idempotencyKey',content_hash,result); END IF; RETURN result;
 ELSIF action='comment.delete' THEN
  PERFORM bong.require_write(); SELECT * INTO comment_row FROM bong.comments WHERE id=(p->>'id')::uuid AND author_id=uid FOR UPDATE;
  IF comment_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF; IF comment_row.version<>(p->>'expectedVersion')::integer THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  UPDATE bong.comments SET state='deleted',deleted_at=now(),updated_at=now(),version=version+1 WHERE id=comment_row.id;
  PERFORM bong.audit('comment',comment_row.id::text,'author-delete','Author requested deletion',comment_row.state,'deleted'); RETURN jsonb_build_object('id',comment_row.id,'state','deleted','version',comment_row.version+1);
 ELSIF action='member.get' THEN
  SELECT * INTO member_row FROM bong.members WHERE handle=p->>'handle' AND deleted_at IS NULL;
  IF member_row.user_id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN jsonb_build_object('id',member_row.user_id,'handle',member_row.handle,'displayName',member_row.display_name,'bio',member_row.bio,'joined',to_char(member_row.created_at,'YYYY-MM'),
   'posts',coalesce((SELECT jsonb_agg(bong.post_dto(x.id,true) ORDER BY x.published_at DESC,x.id DESC) FROM (SELECT id,published_at FROM bong.posts WHERE author_id=member_row.user_id AND state='published' ORDER BY published_at DESC,id DESC LIMIT 20) x),'[]'::jsonb));
 ELSIF action='account.content' THEN
  PERFORM bong.require_session(); lim:=coalesce((p->>'limit')::integer,20); IF lim NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  cur:=bong.unpack_cursor(p->>'cursor'); before_at:=(cur->>'at')::timestamptz; before_id:=(cur->>'id')::uuid;
  IF cur IS NOT NULL AND (cur->>'type' IS DISTINCT FROM 'own' OR before_at IS NULL OR before_id IS NULL) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  SELECT coalesce(jsonb_agg(bong.post_dto(x.id) ORDER BY x.created_at DESC,x.id DESC),'[]'::jsonb) INTO rows_json FROM
   (SELECT id,created_at FROM bong.posts WHERE author_id=uid AND (before_at IS NULL OR (created_at,id)<(before_at,before_id)) ORDER BY created_at DESC,id DESC LIMIT lim+1) x;
  has_more:=jsonb_array_length(rows_json)>lim; IF has_more THEN rows_json:=rows_json-lim; last_row:=rows_json->(lim-1); next_cursor:=bong.pack_cursor(jsonb_build_object('type','own','at',last_row->>'createdAt','id',last_row->>'id')); END IF;
  RETURN jsonb_build_object('items',rows_json,'posts',rows_json,'nextCursor',next_cursor,'comments',coalesce((SELECT jsonb_agg(bong.comment_dto(x.id) ORDER BY x.created_at DESC) FROM (SELECT id,created_at FROM bong.comments WHERE author_id=uid ORDER BY created_at DESC,id DESC LIMIT 30) x),'[]'::jsonb),'page',jsonb_build_object('nextCursor',next_cursor,'hasMore',has_more));
 ELSIF action='report.create' THEN
  IF bong.session_live() THEN
   SELECT * INTO report_row FROM bong.reports WHERE reporter_id=uid AND target_type=p->>'targetType' AND target_id=p->>'targetId' AND status<>'resolved';
   IF report_row.id IS NOT NULL THEN RETURN jsonb_build_object('id',report_row.id,'status',report_row.status); END IF;
   PERFORM bong.account_limit('reports',5,3600);
  ELSE uid:=NULL; PERFORM bong.consume(p->>'subjectKey','visitor-report',3,3600); END IF;
  IF p->>'targetType'='post' AND NOT EXISTS(SELECT 1 FROM bong.posts WHERE id=(p->>'targetId')::uuid AND state='published') THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p->>'targetType'='comment' AND NOT EXISTS(SELECT 1 FROM bong.comments c JOIN bong.posts po ON po.id=c.post_id WHERE c.id=(p->>'targetId')::uuid AND c.state='published' AND po.state='published') THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p->>'targetType'='member' AND NOT EXISTS(SELECT 1 FROM bong.members WHERE user_id=(p->>'targetId')::uuid AND handle IS NOT NULL AND deleted_at IS NULL) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p->>'targetType'='idea' AND NOT EXISTS(SELECT 1 FROM bong.idea_catalog WHERE id=p->>'targetId') THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  INSERT INTO bong.reports(target_type,target_id,reporter_id,reason,detail) VALUES(p->>'targetType',p->>'targetId',uid,p->>'reason',coalesce(p->>'detail','')) RETURNING * INTO report_row;
  RETURN jsonb_build_object('id',report_row.id,'status',report_row.status);
 ELSIF action IN ('media.upload-allowed','media.reserve') THEN
  PERFORM 1 FROM bong.member_state WHERE user_id=uid FOR UPDATE;
  PERFORM bong.require_write(); IF NOT bong.flag('uploads_enabled') THEN RAISE EXCEPTION 'READ_ONLY'; END IF;
  IF action='media.upload-allowed' THEN RETURN jsonb_build_object('allowed',true); END IF;
  key_id:=(p->>'id')::uuid;
  IF p->>'mainKey'<>uid::text||'/'||key_id::text||'/main.webp' OR p->>'thumbKey'<>uid::text||'/'||key_id::text||'/thumb.webp' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF p ? 'cleanupToken' AND p->>'cleanupToken' !~ '^[A-Za-z0-9_-]{43}$' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  INSERT INTO bong.upload_reservations(id,owner_id,session_id,main_key,thumb_key,cleanup_token_hash) VALUES(key_id,uid,sid,p->>'mainKey',p->>'thumbKey',encode(sha256(convert_to(coalesce(p->>'cleanupToken',gen_random_uuid()::text),'UTF8')),'hex'));
  RETURN jsonb_build_object('id',key_id,'status','reserved');
 ELSIF action='media.abort' THEN
  IF NOT EXISTS(SELECT 1 FROM bong.upload_reservations WHERE id=(p->>'id')::uuid AND ((owner_id=uid AND session_id=sid) OR (p->>'cleanupToken' ~ '^[A-Za-z0-9_-]{43}$' AND cleanup_token_hash=encode(sha256(convert_to(p->>'cleanupToken','UTF8')),'hex'))) FOR UPDATE) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM bong.abort_upload((p->>'id')::uuid); RETURN jsonb_build_object('queued',true);
 ELSIF action='media.register' THEN
  PERFORM 1 FROM bong.member_state WHERE user_id=uid FOR UPDATE;
  PERFORM bong.require_write(); IF NOT bong.flag('uploads_enabled') THEN RAISE EXCEPTION 'READ_ONLY'; END IF;
  key_id:=(p->>'id')::uuid;
  IF p->>'mainKey'<>uid::text||'/'||key_id::text||'/main.webp' OR p->>'thumbKey'<>uid::text||'/'||key_id::text||'/thumb.webp' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF NOT EXISTS(SELECT 1 FROM bong.upload_reservations WHERE id=key_id AND owner_id=uid AND status='reserved' AND lease_until>now() FOR UPDATE) THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  INSERT INTO bong.media_assets(id,owner_id,main_key,thumb_key,mime,width,height,main_bytes,thumb_bytes,digest)
  VALUES(key_id,uid,p->>'mainKey',p->>'thumbKey',p->>'mime',(p->>'width')::integer,(p->>'height')::integer,(p->>'mainBytes')::integer,(p->>'thumbBytes')::integer,p->>'digest');
  UPDATE bong.upload_reservations SET status='complete',lease_until=NULL WHERE id=key_id;
  RETURN jsonb_build_object('id',key_id,'width',(p->>'width')::integer,'height',(p->>'height')::integer,'state','unattached');
 ELSIF action='media.authorize' THEN
  key_id:=(p->>'id')::uuid; IF p->>'variant' NOT IN ('main','thumb') THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT bong.can_media(key_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO asset_row FROM bong.media_assets WHERE id=key_id;
  RETURN jsonb_build_object('key',CASE WHEN p->>'variant'='main' THEN asset_row.main_key ELSE asset_row.thumb_key END,'mime',asset_row.mime,'width',asset_row.width,'height',asset_row.height,'expiresIn',60);
 ELSIF action='media.delete' THEN
  PERFORM bong.require_write(); SELECT * INTO asset_row FROM bong.media_assets WHERE id=(p->>'id')::uuid AND owner_id=uid FOR UPDATE;
  IF asset_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF; IF asset_row.state<>'unattached' THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  PERFORM bong.queue_media(asset_row.id); RETURN jsonb_build_object('id',asset_row.id,'state','quarantined');
 ELSIF action='moderation.review' THEN
  PERFORM bong.require_staff(false); key_id:=(p->>'id')::uuid;
  IF EXISTS(SELECT 1 FROM bong.posts WHERE id=key_id) THEN RETURN jsonb_build_object('targetType','post','item',bong.post_dto(key_id)); END IF;
  IF EXISTS(SELECT 1 FROM bong.comments WHERE id=key_id) THEN RETURN jsonb_build_object('targetType','comment','item',bong.comment_dto(key_id)); END IF;
  SELECT * INTO report_row FROM bong.reports WHERE id=key_id;
  IF report_row.id IS NOT NULL THEN RETURN jsonb_build_object('targetType','report','item',jsonb_build_object('id',report_row.id,'targetType',report_row.target_type,'targetId',report_row.target_id,'reason',report_row.reason,'detail',report_row.detail,'status',report_row.status,'version',report_row.version,'createdAt',report_row.created_at)); END IF;
  RAISE EXCEPTION 'NOT_FOUND';
 ELSIF action='moderation.queue' THEN
  PERFORM bong.require_staff(false); lim:=coalesce((p->>'limit')::integer,30); IF lim NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  cur:=bong.unpack_cursor(p->>'cursor'); snapshot_at:=coalesce((cur->>'snapshot')::timestamptz,now()); before_at:=(cur->>'at')::timestamptz; before_id:=(cur->>'id')::uuid;
  IF cur IS NOT NULL AND (cur->>'type' IS DISTINCT FROM 'moderation' OR before_at IS NULL OR before_id IS NULL OR cur->>'scope' NOT IN ('post','comment','report') OR cur->>'priority' NOT IN ('0','1')) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  WITH candidates AS (
   SELECT 1 priority,r.submitted_at created_at,'post'::text target_type,r.post_id id FROM bong.post_revisions r JOIN bong.posts po ON po.id=r.post_id WHERE r.state='pending' AND po.state NOT IN ('deleted','hidden')
   UNION ALL SELECT 1,r.submitted_at,'comment',r.comment_id FROM bong.comment_revisions r JOIN bong.comments c ON c.id=r.comment_id JOIN bong.posts po ON po.id=c.post_id WHERE r.state='pending' AND c.state NOT IN ('deleted','hidden') AND po.state='published'
   UNION ALL SELECT CASE WHEN rr.reason IN ('privacy','dangerous_illegal') THEN 0 ELSE 1 END,rr.created_at,'report',rr.id FROM bong.reports rr WHERE rr.status<>'resolved'
  ), page AS (SELECT * FROM candidates ca WHERE ca.created_at<=snapshot_at AND (cur IS NULL OR (ca.priority,ca.created_at,ca.target_type,ca.id)>((cur->>'priority')::integer,before_at,cur->>'scope',before_id)) ORDER BY priority,created_at,target_type,id LIMIT lim+1)
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'targetType',x.target_type,'createdAt',x.created_at,'priority',x.priority,'item',bong.api('moderation.review',jsonb_build_object('id',x.id))->'item') ORDER BY x.priority,x.created_at,x.target_type,x.id),'[]'::jsonb) INTO rows_json FROM page x;
  has_more:=jsonb_array_length(rows_json)>lim; IF has_more THEN rows_json:=rows_json-lim; last_row:=rows_json->(lim-1); next_cursor:=bong.pack_cursor(jsonb_build_object('type','moderation','snapshot',snapshot_at,'at',last_row->>'createdAt','id',last_row->>'id','scope',last_row->>'targetType','priority',last_row->>'priority')); END IF;
  RETURN jsonb_build_object('items',rows_json,'page',jsonb_build_object('nextCursor',next_cursor,'hasMore',has_more),'nextCursor',next_cursor,
   'posts',coalesce((SELECT jsonb_agg(value->'item') FROM jsonb_array_elements(rows_json) WHERE value->>'targetType'='post'),'[]'::jsonb),
   'comments',coalesce((SELECT jsonb_agg(value->'item') FROM jsonb_array_elements(rows_json) WHERE value->>'targetType'='comment'),'[]'::jsonb),
   'reports',coalesce((SELECT jsonb_agg(value->'item') FROM jsonb_array_elements(rows_json) WHERE value->>'targetType'='report'),'[]'::jsonb),
   'counts',jsonb_build_object('posts',(SELECT count(*) FROM bong.post_revisions r JOIN bong.posts po ON po.id=r.post_id WHERE r.state='pending' AND po.state NOT IN ('hidden','deleted')),'comments',(SELECT count(*) FROM bong.comment_revisions r JOIN bong.comments c ON c.id=r.comment_id JOIN bong.posts po ON po.id=c.post_id WHERE r.state='pending' AND c.state NOT IN ('hidden','deleted') AND po.state='published'),'reports',(SELECT count(*) FROM bong.reports WHERE status<>'resolved')));
 ELSIF action='moderation.decide' THEN
  PERFORM bong.require_staff(); PERFORM bong.account_limit('staff-decisions',60,60);
  reason:=btrim(p->>'reason'); IF char_length(coalesce(reason,'')) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  action_name:=p->>'action'; key_id:=(p->>'id')::uuid; revision_id:=(p->>'revisionId')::uuid;
  IF p->>'targetType'='post' THEN
   SELECT * INTO post_row FROM bong.posts WHERE id=key_id FOR UPDATE;
   IF post_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF; IF post_row.version<>(p->>'expectedVersion')::integer THEN RAISE EXCEPTION 'CONFLICT'; END IF;
   old_state:=post_row.state;
   IF action_name IN ('approve','reject') THEN
    SELECT * INTO revision_row FROM bong.post_revisions WHERE id=revision_id AND post_id=key_id AND state='pending' FOR UPDATE;
    IF revision_row.id IS NULL OR post_row.latest_revision_id<>revision_id OR post_row.state IN ('hidden','deleted') THEN RAISE EXCEPTION 'CONFLICT'; END IF;
    IF action_name='approve' THEN
     IF post_row.author_id=uid AND EXISTS(SELECT 1 FROM bong.revision_assets WHERE revision_assets.revision_id=vars.revision_id) THEN RAISE EXCEPTION 'SELF_REVIEW'; END IF;
     PERFORM bong.publish_post(key_id,revision_id);
    ELSE UPDATE bong.post_revisions SET state='rejected',author_reason=reason WHERE id=revision_id; END IF;
   ELSIF action_name='hide' THEN
    IF post_row.state<>'published' THEN RAISE EXCEPTION 'CONFLICT'; END IF;
    UPDATE bong.posts SET state='hidden',hidden_at=now(),search_vector=''::tsvector WHERE id=key_id;
   ELSIF action_name='restore' THEN
    IF post_row.state NOT IN ('hidden','deleted') OR post_row.approved_revision_id IS NULL OR coalesce(post_row.deleted_at,post_row.hidden_at)<now()-interval '30 days' OR EXISTS(SELECT 1 FROM bong.member_state WHERE user_id=post_row.author_id AND state IN ('deleting','deleted')) OR EXISTS(SELECT 1 FROM bong.revision_assets ra JOIN bong.media_assets ma ON ma.id=ra.asset_id WHERE ra.revision_id=post_row.approved_revision_id AND ma.state<>'attached') THEN RAISE EXCEPTION 'CONFLICT'; END IF;
    PERFORM bong.publish_post(key_id,post_row.approved_revision_id);
   ELSE RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   UPDATE bong.posts SET version=version+1,updated_at=now() WHERE id=key_id RETURNING * INTO post_row;
   PERFORM bong.audit('post',key_id::text,action_name,reason,old_state,post_row.state,revision_id,p->>'privateNote');
   RETURN jsonb_build_object('id',key_id,'state',post_row.state,'version',post_row.version);
  ELSIF p->>'targetType'='comment' THEN
   SELECT * INTO comment_row FROM bong.comments WHERE id=key_id FOR UPDATE;
   IF comment_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF; IF comment_row.version<>(p->>'expectedVersion')::integer THEN RAISE EXCEPTION 'CONFLICT'; END IF; old_state:=comment_row.state;
   IF action_name IN ('approve','reject') THEN
    IF comment_row.latest_revision_id IS DISTINCT FROM revision_id OR comment_row.state IN ('hidden','deleted') OR NOT EXISTS(SELECT 1 FROM bong.comment_revisions WHERE id=revision_id AND comment_id=key_id AND state='pending') OR NOT EXISTS(SELECT 1 FROM bong.posts WHERE id=comment_row.post_id AND state='published') THEN RAISE EXCEPTION 'CONFLICT'; END IF;
    IF action_name='approve' THEN PERFORM bong.publish_comment(key_id,revision_id); ELSE UPDATE bong.comment_revisions SET state='rejected',author_reason=reason WHERE id=revision_id; END IF;
   ELSIF action_name='hide' THEN IF comment_row.state<>'published' THEN RAISE EXCEPTION 'CONFLICT'; END IF; UPDATE bong.comments SET state='hidden' WHERE id=key_id;
   ELSIF action_name='restore' THEN
    IF comment_row.state NOT IN ('hidden','deleted') OR comment_row.approved_revision_id IS NULL OR comment_row.updated_at<now()-interval '30 days' OR EXISTS(SELECT 1 FROM bong.member_state WHERE user_id=comment_row.author_id AND state IN ('deleting','deleted')) OR NOT EXISTS(SELECT 1 FROM bong.posts WHERE id=comment_row.post_id AND state='published') THEN RAISE EXCEPTION 'CONFLICT'; END IF;
    PERFORM bong.publish_comment(key_id,comment_row.approved_revision_id);
   ELSE RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   UPDATE bong.comments SET version=version+1,updated_at=now() WHERE id=key_id RETURNING * INTO comment_row;
   PERFORM bong.audit('comment',key_id::text,action_name,reason,old_state,comment_row.state,revision_id,p->>'privateNote'); RETURN jsonb_build_object('id',key_id,'state',comment_row.state,'version',comment_row.version);
  ELSIF p->>'targetType'='report' THEN
   SELECT * INTO report_row FROM bong.reports WHERE id=key_id FOR UPDATE;
   IF report_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF; IF report_row.version<>(p->>'expectedVersion')::integer OR report_row.status='resolved' THEN RAISE EXCEPTION 'CONFLICT'; END IF;
   IF action_name NOT IN ('resolve','escalate') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   UPDATE bong.reports SET status=CASE WHEN action_name='resolve' THEN 'resolved' ELSE 'escalated' END,resolution=vars.reason,version=version+1,resolved_at=CASE WHEN action_name='resolve' THEN now() ELSE NULL END WHERE id=key_id;
   PERFORM bong.audit('report',key_id::text,action_name,reason,report_row.status,CASE WHEN action_name='resolve' THEN 'resolved' ELSE 'escalated' END,NULL,p->>'privateNote'); RETURN jsonb_build_object('id',key_id,'version',report_row.version+1);
  ELSE RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
 ELSIF action='member.status' THEN
  PERFORM bong.require_staff(); PERFORM bong.account_limit('staff-decisions',60,60); key_id:=(p->>'id')::uuid; action_name:=p->>'action'; reason:=btrim(p->>'reason');
  IF key_id=uid OR EXISTS(SELECT 1 FROM bong.staff_roles WHERE user_id=key_id AND revoked_at IS NULL) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF char_length(coalesce(reason,'')) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  SELECT * INTO state_row FROM bong.member_state WHERE user_id=key_id FOR UPDATE;
  IF state_row.user_id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF; IF state_row.state IN ('deleting','deleted') THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  IF action_name IN ('ban','unban') THEN PERFORM bong.require_staff(true,true); END IF;
  IF action_name IN ('trust','untrust') THEN UPDATE bong.member_state SET trusted_text=action_name='trust' WHERE user_id=key_id;
  ELSIF action_name='suspend' THEN
   IF (p->>'until')::timestamptz<=now() OR (p->>'until')::timestamptz>now()+interval '30 days' OR p->>'until' IS NULL OR state_row.state='banned' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   UPDATE bong.member_state SET state='suspended',suspension_until=(p->>'until')::timestamptz,state_reason=reason WHERE user_id=key_id;
  ELSIF action_name='unsuspend' THEN IF state_row.state<>'suspended' THEN RAISE EXCEPTION 'CONFLICT'; END IF; UPDATE bong.member_state SET state='active',suspension_until=NULL,state_reason=reason WHERE user_id=key_id;
  ELSIF action_name='ban' THEN UPDATE bong.member_state SET state='banned',state_reason=reason WHERE user_id=key_id;
  ELSIF action_name='unban' THEN IF state_row.state<>'banned' THEN RAISE EXCEPTION 'CONFLICT'; END IF; UPDATE bong.member_state SET state='active',state_reason=reason WHERE user_id=key_id;
  ELSIF action_name='hide-content' THEN
   UPDATE bong.posts SET state='hidden',hidden_at=now(),version=version+1,updated_at=now(),search_vector=''::tsvector WHERE author_id=key_id AND state='published';
   UPDATE bong.comments SET state='hidden',version=version+1,updated_at=now() WHERE author_id=key_id AND state='published';
  ELSE RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF action_name IN ('suspend','ban') THEN UPDATE bong.app_sessions SET revoked_at=now() WHERE user_id=key_id AND revoked_at IS NULL; END IF;
  PERFORM bong.audit('member',key_id::text,action_name,reason,state_row.state,(SELECT state FROM bong.member_state WHERE user_id=key_id)); RETURN jsonb_build_object('id',key_id,'action',action_name);
 ELSIF action IN ('member.moderation','moderation.member') THEN
  PERFORM bong.require_staff(false); SELECT * INTO member_row FROM bong.members WHERE user_id=(p->>'id')::uuid; SELECT * INTO state_row FROM bong.member_state WHERE user_id=member_row.user_id;
  IF member_row.user_id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN jsonb_build_object('id',member_row.user_id,'handle',member_row.handle,'displayName',member_row.display_name,'state',state_row.state,'trustedText',state_row.trusted_text,'suspensionUntil',state_row.suspension_until);
 ELSIF action='feature.list' THEN
  PERFORM bong.require_staff(false,true); RETURN jsonb_build_object('items',(SELECT jsonb_agg(jsonb_build_object('name',name,'value',enabled,'version',version) ORDER BY name) FROM bong.feature_settings));
 ELSIF action='feature.update' THEN
  PERFORM bong.require_staff(true,true); SELECT * INTO feature_row FROM bong.feature_settings WHERE name=p->>'name' FOR UPDATE;
  IF feature_row.name IS NULL THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF; IF feature_row.version<>(p->>'expectedVersion')::integer THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  UPDATE bong.feature_settings SET enabled=(p->>'value')::boolean,version=version+1,actor_id=uid,reason=p->>'reason',updated_at=now() WHERE name=feature_row.name;
  PERFORM bong.audit('feature',feature_row.name,'update',p->>'reason',feature_row.enabled::text,p->>'value'); RETURN jsonb_build_object('name',feature_row.name,'enabled',(p->>'value')::boolean,'version',feature_row.version+1);
 ELSIF action='audit.list' THEN
  PERFORM bong.require_staff(false,true); lim:=coalesce((p->>'limit')::integer,30); IF lim NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  RETURN jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT ma.id,ma.actor_id AS "actorId",ma.actor_role AS "actorRole",ma.target_type AS "targetType",ma.target_id AS "targetId",ma.revision_id AS "revisionId",ma.action,ma.reason,ma.private_note AS "privateNote",ma.previous_state AS "previousState",ma.new_state AS "newState",ma.request_id AS "requestId",ma.created_at AS "createdAt" FROM bong.moderation_actions ma ORDER BY ma.created_at DESC,ma.id DESC LIMIT lim) x),'[]'::jsonb));
 ELSIF action IN ('account.export','account.delete') THEN
  PERFORM bong.require_reauth(); SELECT * INTO state_row FROM bong.member_state WHERE user_id=uid FOR UPDATE;
  IF action='account.export' AND state_row.state IN ('deleting','deleted') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  action_name:=CASE WHEN action='account.export' THEN 'export' ELSE 'deletion' END;
  SELECT * INTO job_row FROM bong.account_jobs WHERE user_id=uid AND kind=action_name AND status IN ('queued','processing','retry');
  IF job_row.id IS NOT NULL THEN RETURN jsonb_build_object('id',job_row.id,'status',job_row.status,'kind',job_row.kind); END IF;
  IF action='account.delete' THEN
   IF coalesce((p->>'confirmed')::boolean,false)=false THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
   PERFORM pg_advisory_xact_lock(82443982343);
   IF EXISTS(SELECT 1 FROM bong.staff_roles WHERE user_id=uid AND role='admin' AND revoked_at IS NULL) AND (SELECT count(*) FROM bong.staff_roles r JOIN bong.member_state ms ON ms.user_id=r.user_id WHERE r.role='admin' AND r.revoked_at IS NULL AND ms.state='active')<=1 THEN RAISE EXCEPTION 'LAST_ADMIN'; END IF;
   UPDATE bong.member_state SET state='deleting',trusted_text=false WHERE user_id=uid;
   UPDATE bong.app_sessions SET revoked_at=now() WHERE user_id=uid AND session_id<>sid AND revoked_at IS NULL;
   UPDATE bong.posts SET state='deleted',deleted_at=now(),version=version+1,updated_at=now(),search_vector=''::tsvector WHERE author_id=uid AND state<>'deleted';
   UPDATE bong.comments SET state='deleted',deleted_at=now(),version=version+1,updated_at=now() WHERE author_id=uid AND state<>'deleted';
   UPDATE bong.members SET deleted_at=now() WHERE user_id=uid;
   FOR rec IN SELECT id FROM bong.media_assets WHERE owner_id=uid AND state<>'deleted' LOOP PERFORM bong.queue_media(rec.id); END LOOP;
   INSERT INTO bong.object_deletions(bucket,object_key) SELECT 'exports',id::text||'/export.json' FROM bong.account_jobs WHERE user_id=uid AND kind='export' ON CONFLICT(bucket,object_key) DO NOTHING;
   UPDATE bong.account_jobs SET phase='cancelled' WHERE user_id=uid AND kind='export' AND status<>'complete';
   INSERT INTO bong.object_deletions(bucket,object_key) SELECT 'media',main_key FROM bong.upload_reservations WHERE owner_id=uid AND status='reserved' ON CONFLICT(bucket,object_key) DO NOTHING;
   INSERT INTO bong.object_deletions(bucket,object_key) SELECT 'media',thumb_key FROM bong.upload_reservations WHERE owner_id=uid AND status='reserved' ON CONFLICT(bucket,object_key) DO NOTHING;
  ELSE PERFORM bong.account_limit('export',3,86400); END IF;
  INSERT INTO bong.account_jobs(user_id,kind) VALUES(uid,action_name) RETURNING * INTO job_row;
  IF action_name='deletion' THEN UPDATE bong.upload_reservations SET deletion_job_id=job_row.id WHERE owner_id=uid; END IF;
  IF action_name='deletion' THEN INSERT INTO bong.deletion_ledger(job_id,user_hash,resource_ids) VALUES(job_row.id,encode(sha256(convert_to(uid::text,'UTF8')),'hex'),jsonb_build_object('posts',coalesce((SELECT jsonb_agg(id) FROM bong.posts WHERE author_id=uid),'[]'::jsonb),'comments',coalesce((SELECT jsonb_agg(id) FROM bong.comments WHERE author_id=uid),'[]'::jsonb))); END IF;
  PERFORM bong.audit('account',uid::text,action_name,'Member requested account data action',state_row.state,CASE WHEN action_name='deletion' THEN 'deleting' ELSE state_row.state END);
  RETURN jsonb_build_object('id',job_row.id,'status',job_row.status,'kind',job_row.kind);
 ELSIF action='account.jobs' THEN
  PERFORM bong.require_session(); SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'kind',x.kind,'status',x.status,'phase',x.phase,'createdAt',x.created_at,'expiresAt',x.expires_at,'errorCode',x.error_code) ORDER BY x.created_at DESC),'[]'::jsonb) INTO rows_json FROM (SELECT * FROM bong.account_jobs WHERE user_id=uid ORDER BY created_at DESC,id DESC LIMIT 30) x;
  RETURN jsonb_build_object('items',rows_json,'jobs',rows_json);
 ELSIF action='account.job' THEN
  PERFORM bong.require_session(); SELECT * INTO job_row FROM bong.account_jobs WHERE id=(p->>'id')::uuid AND user_id=uid;
  IF job_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN jsonb_build_object('id',job_row.id,'kind',job_row.kind,'status',job_row.status,'phase',job_row.phase,'createdAt',job_row.created_at,'expiresAt',job_row.expires_at,
   'exportKey',CASE WHEN job_row.kind='export' AND job_row.status='complete' AND job_row.expires_at>now() THEN job_row.export_key ELSE NULL END);
 ELSE RAISE EXCEPTION 'UNKNOWN_ACTION'; END IF;
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA bong FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bong.api(text,jsonb) TO bong_runtime;
GRANT EXECUTE ON FUNCTION bong.maintenance_api(text,jsonb) TO bong_maintenance;
RESET ROLE;
COMMIT;
